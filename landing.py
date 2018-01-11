#landing.py
#This file handles login/landing page 
#Copyright (C) 2017  Joshua Reed
#This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.


from the_root.extensions import login_manager, db
from the_root.forms import LoginForm, CreateForm
from the_root.models import User
from the_root import app
from the_root.decorators import render_template_standard

import flask
from flask_login import login_required, login_user, logout_user, current_user

from flask import render_template, send_file
	
@app.route("/")
def landing():
	return render_template_standard("/landing.html")
	
@app.route("/robots.txt")
def robots():
	return send_file('robots.txt')

@app.route("/about")
def about():
	return render_template_standard("/about.html")
	
#The main launcher page with the app listing.
@app.route("/launcher", methods=['GET', 'POST'])
def launcher():
	return render_template_standard("/launcher.html")