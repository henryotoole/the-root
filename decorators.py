#decorators.py
#A collection of utility functions (not all of which are decorators)
#Copyright (C) 2017  Joshua Reed
#This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.


from functools import wraps
from flask import g, request, redirect, url_for, render_template
from flask_login import current_user

from the_root.models import Privilege
from the_root import app

#WARNING: Untested on the_root server
def admin_required(f): # Tested, works.
	@wraps(f) # https://stackoverflow.com/questions/308999/what-does-functools-wraps-do
	def decorated_function(*args, **kwargs):
		if not Privilege.query.filter_by(userid=current_user.id).filter_by(tag='admin').first(): # If no admin tag for this user.
			return "Must be admin", 403
		return f(*args, **kwargs)
	return decorated_function
	
#This isn't a decorator, but it's a general purpose utility function so I'm putting it here.
#This simply renders a template while passing a few standard variables from the config to the client. These vars are needed
#in nearly every template.
def render_template_standard(template_name, **kwargs):
	web_vsn = app.config['WEBSITE_VERSION']
	sp_local = app.config['STATIC_URL_LOCAL']
	sp_content = app.config['STATIC_URL_CONTENT']
	return render_template(template_name, sp_local=sp_local, sp_content=sp_content, web_vsn=web_vsn, **kwargs)