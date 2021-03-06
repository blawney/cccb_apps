# -*- coding: utf-8 -*-
import datetime
import json
import os

from __future__ import unicode_literals
from django.shortcuts import render
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden, HttpResponseRedirect
from django.contrib.auth.decorators import login_required
from django.conf import settings
from client_setup.models import Project, Sample, DataSource, Organism

from rnaseq import rnaseq_process

import helpers

class ProjectDisplay(object):
	"""
	A simple container class used when displaying the project in the UI
	"""
	def __init__(self, pk, name, service, completed, in_progress, finish_time):
		self.pk = pk
		self.name = name
		self.service = service
		self.completed = completed
		self.in_progress = in_progress
		if finish_time:
			self.finish_time = finish_time.strftime('%b %d, %Y (%H:%M)')
		else:
			self.finish_time = '-'


class FileDisplay(object):
	"""
	A simple container class used to display file details in the UI
	"""
	def __init__(self, samplename, pk, filepath):
		self.samplename = samplename
		self.pk = pk
		self.file_string = os.path.basename(filepath)


@login_required
def set_genome(request, project_pk):
	"""
	Called (by ajax) when setting the selecting/setting the reference genome
	"""
    project = helpers.check_ownership(project_pk, request.user)
    if project is not None:
        selected_genome = request.POST.get('selected_genome')
        org = Organism.objects.get(reference_genome = selected_genome)
        project.reference_organism = org
        project.save()
        return HttpResponse('')
	else:
		return HttpResponseBadRequest('')


@login_required
def genome_selection_page(request, project_pk):
	"""
	Sets up the page where users select their reference genome
	"""
    project = helpers.check_ownership(project_pk, request.user)
    if project is not None:
        d = {}
        orgs = Organism.objects.all()
        for org in orgs:
            d[org.reference_genome] = org.description
        return render(request, 'analysis_portal/choose_genome.html', {'project_pk': project.pk, 'references':d, 'project_name':project.name})
	else:
		return HttpResponseBadRequest('')


def finish():
	print 'Do some final pulling together'


def notify(request):
	"""
	Called when an a worker completes
	"""

	# at this endpoint, we only want to accept internal requests (from another GCE instance)
	user_ip = request.META['REMOTE_ADDR']
	if user_ip.startswith('10.142'):
		project_pk = int(request.GET.get('projectPK', ''))
		sample_pk = int(request.GET.get('samplePK', ''))
		print 'Project %s, sample %s has finished' % (project_pk, sample_pk) 
		project = Project.objects.get(pk = project_pk)
		sample = Sample.objects.get(pk = sample_pk)
		sample.processed = True
		sample.save()

		# now check to see if everyone is done
		all_samples = project.sample_set.all()
		if all([s.processed for s in all_samples]):
			print 'All samples have completed!'
			project.in_progress = False
			project.completed = True
			project.finish_time = datetime.datetime.now()
			project.save()
			finish()
		else:
			print 'Not all of the samples have finished'
		return HttpResponse('thanks')
	else:
		return HttpResponseBadRequest('')	


@login_required
def home_view(request):
	"""
	Displays all the projects
	"""
	context = {}
	user = request.user
	users_projects = Project.objects.filter(owner=user)

	# format the time
	projects = []
	for p in users_projects:
		projects.append(ProjectDisplay(p.pk, p.name, p.service.name, p.completed, p.in_progress, p.finish_time))

	context['projects'] = projects
	return render(request, 'analysis_portal/home.html', context)


@login_required
def upload_page(request, project_pk):
	"""
	This fills out the upload page
	"""
    project = helpers.check_ownership(project_pk, request.user)
    if project is not None:
		uploaded_files = project.datasource_set.all() # gets the files with this as their project
		existing_files = []
		for f in uploaded_files:
			if f.sample:
				samplename = f.sample.name
			else:
				samplename = None	
			existing_files.append(FileDisplay(samplename, f.pk, f.filepath))
        return render(request, 'analysis_portal/upload_page.html', {'project_name': project.name, 'existing_files':existing_files, 'project_pk': project_pk})
    else:        
		return HttpResponseBadRequest('')
	

@login_required
def change_project_name(request, project_pk):
	"""
	Called (via ajax) to change the name of the project
	"""
	project = helpers.check_ownership(project_pk, request.user)
	if project is not None:
		project.name = request.POST.get('new_name')
		project.save()
		return HttpResponse("")
	else:
		return HttpResponseBadRequest('')


@login_required
def add_new_file(request, project_pk):
    project = helpers.check_ownership(project_pk, request.user)
    if project is not None:
        newfile = request.POST.get('filename')
        newfile = os.path.join(settings.UPLOAD_PREFIX, newfile)
        # see if it already exists:
        if DataSource.objects.filter(project=project, filepath=newfile).exists():
            # file was updated in google storage, but nothing to do here.  Return 204 so the front-end doesn't make more 'icons' for this updated file
            return HttpResponse(status=204)
        else:
            new_ds = DataSource(project=project, source_type = 'fastq', filepath=newfile)
            new_ds.save()
            return HttpResponse('')
    else:
		return HttpResponseBadRequest('')


@login_required
def delete_file(request, project_pk):
	"""
	Called (via ajax) when removing a file.  Note that this does not remove the file from google storage bucket.
	It only removes the record of it from our database.
	TODO: change that-- remove from google storage as well.
	"""
	project = helpers.check_ownership(project_pk, request.user)
	if project is not None:
		file_to_rm = request.POST.get('filename')
		file_to_rm = os.path.join(settings.UPLOAD_PREFIX, file_to_rm)
		instance = DataSource.objects.get(filepath=file_to_rm, project=project)	
		instance.delete()
		return HttpResponse('')
	else:
		return HttpResponseBadRequest('')
		

@login_required
def annotate_files_and_samples(request, project_pk):
	"""
	Populates the annotation page
	TODO: infer samples from filenames
	"""
	project = helpers.check_ownership(project_pk, request.user)
	if project is not None:
		zero_uploaded_files = True
		uploaded_files = project.datasource_set.all() # gets the files with this as their project
		if len(uploaded_files) > 0:
		    zero_uploaded_files = False
		existing_samples = project.sample_set.all() # any samples that were already defined

		unassigned_files = []
		assigned_files = {x.name:[] for x in existing_samples}
		for f in uploaded_files:
			fdisplay = FileDisplay('', f.pk, f.filepath)
			if f.sample in existing_samples:
				assigned_files[f.sample.name].append(fdisplay)
			else:
				unassigned_files.append(fdisplay)
		return render(request, 'analysis_portal/annotate.html', {'project_name': project.name, 'unassigned_files':unassigned_files, 'assigned_files': assigned_files, 'project_pk': project_pk, 'no_uploaded_files':zero_uploaded_files})
	else:
		return HttpResponseBadRequest('')
				
		
@login_required
def create_sample(request, project_pk):
	"""
	Called (via ajax) when creating a new sample in the UI
	"""
	project = helpers.check_ownership(project_pk, request.user)
	if project is not None:
		name = request.POST.get('name')
		metadata = request.POST.get('metadata')
		s = Sample(name=name, metadata=metadata, project=project)
		s.save()
		return HttpResponse('');
	else:
		return HttpResponseBadRequest('')


@login_required
def rm_sample(request, project_pk):
	"""
	Removes a sample. 
	As part of this, resets the 'sample' attribute of the DataSource.
	So, keeps the datasource, but just removes that file's association with the deleted sample
	"""
	project = helpers.check_ownership(project_pk, request.user)
	if project is not None:
		name = request.POST.get('samplename')
		s = Sample.objects.get(name=name, project=project)

		# get all the data sources assigned to this sample and set their sample attribute to be None
		ds_set = s.datasource_set.all()
		for ds in ds_set:
			ds.sample = None
			ds.save()
		# finally, delete the Sample object
		s.delete()
		return HttpResponse('')
	else:
		return HttpResponseBadRequest('')


@login_required
def map_files_to_samples(request, project_pk):
	project = helpers.check_ownership(project_pk, request.user)
	if project is not None:
		j = json.loads(request.POST.get('mapping'))
		for sample, files in j.items():
			sample_obj = project.sample_set.get(name=sample)
			for f in files:
				f = os.path.join(settings.UPLOAD_PREFIX,f)
				ds = DataSource.objects.get(filepath=f, project=project)
				ds.sample = sample_obj
				ds.save()
		return HttpResponse('')
	else:
		return HttpResponseBadRequest('')


@login_required
def summary(request, project_pk):
	"""
	Summarizes the project prior to performing the analysis
	"""
	project = helpers.check_ownership(project_pk, request.user)
	if project is not None:
		full_mapping = {}
		all_samples = project.sample_set.all()
		for s in all_samples:
			data_sources = s.datasource_set.all()	
			full_mapping[s] = ', '.join([os.path.basename(x.filepath) for x in data_sources])
		return render(request, 'analysis_portal/summary.html', {'mapping':full_mapping, 'project_pk':project.pk})
	else:
		return HttpResponseBadRequest('')


@login_required
def kickoff(request, project_pk):
	"""
	Starts the analysis
	TODO: abstract this for ease
	"""
	project = helpers.check_ownership(project_pk, request.user)
	if project is not None:
		if project.service.name == 'RNA-Seq':
			pk = project.pk
			rnaseq_process.start_analysis(pk)
			project.in_progress = True
			project.start_time = datetime.datetime.now()
			project.save()
		else:
			print 'Could not figure out project type'
		return HttpResponseRedirect('/')
