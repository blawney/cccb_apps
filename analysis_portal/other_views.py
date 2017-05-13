# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseBadRequest
import datetime
import helpers

@login_required
def show_in_progress(request, project_pk):
	project = helpers.check_ownership(project_pk, request.user)
	if project:
		start_date = project.start_time.strftime('%b %d, %Y')
		start_time = project.start_time.strftime('%H:%M')
		time_str = 'Started on %s at %s' % (start_date, start_time)
		return render(request, 'analysis_portal/in_progress.html', {'project_name': project.name, 'time_str':time_str})
	else:
		return HttpResponseBadRequest('')


@login_required
def show_complete(request, project_pk):
	project = helpers.check_ownership(project_pk, request.user)
	if project:
		start_date = project.start_time.strftime('%b %d, %Y')
		start_time = project.start_time.strftime('%H:%M')
		start_time_str = 'Started on %s at %s' % (start_date, start_time)

		finish_date = project.finish_time.strftime('%b %d, %Y')
		finish_time = project.finish_time.strftime('%H:%M')
		finish_time_str = 'Finished on %s at %s' % (finish_date, finish_time)
		return render(request, 'analysis_portal/complete.html', {'project_name': project.name, 'start_time_str':start_time_str, 'finish_time_str':finish_time_str})
	else:
		return HttpResponseBadRequest('')
