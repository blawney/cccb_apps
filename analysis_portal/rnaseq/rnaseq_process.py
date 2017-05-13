from google.cloud import storage
import googleapiclient.discovery
import os
import json
import urllib
import urllib2
from ConfigParser import SafeConfigParser
import sys
print sys.path
sys.path.append('/home/brian_lawney/cccb_applications')
from client_setup.models import Project, Sample, DataSource


CONFIG_FILE = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'config.cfg')
CALLBACK_URL = 'analysis/notify/'

def parse_config():
    with open(CONFIG_FILE) as cfg_handle:
        parser = SafeConfigParser()
        parser.readfp(cfg_handle)
        return parser.defaults()


def setup(project_pk, config_params):
    
    # note that project was already confirmed for ownership previously.  No need to check here.
    project = Project.objects.get(pk=project_pk)

    # get the reference genome
    reference_genome = project.reference_organism.reference_genome
    config_params['reference_genome'] = reference_genome

    bucket_name = project.bucket
    
    # get datasources from db:
    datasources = project.datasource_set.all()
    datasource_paths = [os.path.join(bucket_name, x.filepath) for x in datasources]
    datasource_paths = [config_params['gs_prefix'] + x for x in datasource_paths]

    # check that those datasources exist in the actual bucket
    storage_client = storage.Client()
    bucket = storage_client.get_bucket(bucket_name)
    all_contents = bucket.list_blobs()
    uploads = [x.name for x in all_contents if x.name.startswith(config_params['upload_folder'])]
    
    # compare-- it's ok if there were more files in the bucket
    bucket_set = set(uploads)
    datasource_set = set(datasource_paths)
    if len(datasource_set.difference(uploads)) > 0:
        # TODO raise exception
        pass

    # create the output bucket
    result_bucket_name = os.path.join(bucket_name, config_params['output_bucket'])
    #result_bucket = storage_client.create_bucket(result_bucket_name)

    # get the mapping of samples to data sources:
    sample_mapping = {}
    all_samples = project.sample_set.all()
    for s in all_samples:
        sample_mapping[(s.pk, s.name)] = []
    for ds in datasources:
        if ds.sample in all_samples:
            sample_mapping[(ds.sample.pk, ds.sample.name)].append(ds)

    return project, result_bucket_name, sample_mapping


def get_internal_ip():
    url = 'http://metadata/computeMetadata/v1/instance/network-interfaces/0/ip'
    request = urllib2.Request(url)
    request.add_header('X-Google-Metadata-Request', 'True')
    response = urllib2.urlopen(request)
    result = response.read()
    return result


def launch_workers(compute, project, result_bucket_name, sample_mapping, config_params):
    """
    sample_mapping is a dict with a (int,str) tuple (sample PK, sample name) as the key, pointing at a list of DataSource objects
    """
    # first, check that they list of DataSource objects are all the same length:
    length_list = []
    for sample_tuple, ds_list in sample_mapping.items():
        length_list.append(len(ds_list))
    lengthset = set(length_list)
    if len(lengthset) != 1:
        # TODO not all paired or single- raise error
        pass

    input_bucket_name = project.bucket
    for sample_tuple, ds_list in sample_mapping.items():
        file_list = sorted([config_params['gs_prefix'] + os.path.join(input_bucket_name, ds.filepath) for ds in ds_list])
        kwargs = {}
        kwargs['r1_fastq'] = file_list[0]
        kwargs['r2_fastq'] = ''
        # if paired
        if len(file_list) == 2:
            kwargs['r2_fastq'] = file_list[1]
        elif len(file_list) > 2:
            #TODO: something weird happened
            pass
        # now add the other params to the dictionary:
        kwargs['result_bucket_name'] = config_params['gs_prefix'] + result_bucket_name
        kwargs['reference_genome'] = config_params['reference_genome']
        kwargs['sample_name'] = sample_tuple[1] 
        kwargs['genome_config_path'] = config_params['gs_prefix'] + os.path.join(config_params['startup_bucket'], config_params['genome_config_file'])
        kwargs['align_script_template'] = config_params['gs_prefix'] + os.path.join(config_params['startup_bucket'], config_params['align_script_template'])
        kwargs['project_pk'] = project.pk
        kwargs['sample_pk'] = sample_tuple[0]
        kwargs['callback_url'] = 'http://%s:8080/%s' % (get_internal_ip(), CALLBACK_URL)
        kwargs['startup_script'] = config_params['gs_prefix'] + os.path.join(config_params['startup_bucket'], config_params['startup_script'])

        launch_custom_instance(compute, config_params['google_project'], config_params['default_zone'], 'worker-%s' % sample_tuple[1].lower(), kwargs, config_params)


def launch_custom_instance(compute, google_project, zone, instance_name, kwargs, config_params):

    result_bucket_name = kwargs['result_bucket_name']
    sample_name = kwargs['sample_name']
    r1_fastq = kwargs['r1_fastq']
    r2_fastq = kwargs['r2_fastq']
    reference_genome = kwargs['reference_genome']
    genome_config_path = kwargs['genome_config_path']
    align_script_template = kwargs['align_script_template']
    startup_script_url = kwargs['startup_script']
    cccb_project_pk = kwargs['project_pk']
    sample_pk = kwargs['sample_pk']
    callback_url = kwargs['callback_url']

    source_disk_image = 'projects/%s/global/images/%s' % (config_params['google_project'], config_params['image_name'])

    machine_type = "zones/%s/machineTypes/%s" % (zone, config_params['machine_type']) 

    config = {
        'name': instance_name,
        'machineType': machine_type,

        # Specify the boot disk and the image to use as a source.
        'disks': [
            {
                'boot': True,
                'autoDelete': True,
                'initializeParams': {
                    'sourceImage': source_disk_image,
                }
            }
        ],

        # Specify a network interface with NAT to access the public
        # internet.
        'networkInterfaces': [{
            'network': 'global/networks/default',
            'accessConfigs': [
                {'type': 'ONE_TO_ONE_NAT', 'name': 'External NAT'}
            ]
        }],

        # Allow the instance to access cloud storage and logging.
        'serviceAccounts': [{
            'email': 'default',
            'scopes': [
                'https://www.googleapis.com/auth/compute',
                'https://www.googleapis.com/auth/devstorage.read_write',
                'https://www.googleapis.com/auth/logging.write'
            ]
        }],
 
        'metadata': {
            'items': [{
                # Startup script is automatically executed by the
                # instance upon startup.
                'key': 'startup-script-url',
                'value': startup_script_url
            },
            {
              'key':'result_bucket_name',
              'value': result_bucket_name
            },
            {
              'key':'sample_name',
              'value': sample_name
            },
            {
              'key':'r1_fastq',
              'value': r1_fastq
            },
            {
              'key':'r2_fastq',
              'value': r2_fastq
            },
            {
              'key':'reference_genome',
              'value': reference_genome
            },
            {
              'key':'genome_config_path',
              'value': genome_config_path
            },
            {
              'key':'align_script_template',
              'value': align_script_template
            },
            {
              'key':'google_project',
              'value': config_params['google_project']
            },
            {
              'key':'google_zone',
              'value': config_params['default_zone']
            },
            {
              'key':'project_pk',
              'value': cccb_project_pk
            },
            {
              'key':'sample_pk',
              'value': sample_pk
            },
            {
                'key':'callback_url',
                'value': callback_url
            }
          ]
        }
    }

    return compute.instances().insert(
        project=google_project,
        zone=zone,
        body=config).execute()


def start_analysis(project_pk):

    config_params = parse_config()
    project, result_bucket_name, sample_mapping = setup(project_pk, config_params)
    compute = googleapiclient.discovery.build('compute', 'v1')
    launch_workers(compute, project, result_bucket_name, sample_mapping, config_params)


if __name__=='__main__':
    start_analysis(20)
