#voyager.py
#
#This is a simple service which provides a lightweight way to record and view interesting places and adventures across the world.
#Copyright (C) 2017  Joshua Reed
#This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.

from the_root.extensions import db, csrf
from the_root import app
from the_root.decorators import render_template_standard

import flask
from flask_login import login_required, current_user

from flask import render_template, redirect, request, jsonify

@app.route("/voyager", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def voyager():
	return render_template_standard("/voyager/overview.html")
	
@app.route("/voyager/add", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def voyager_record():
	return render_template_standard("/voyager/record.html")
	
	
@csrf.exempt # This is added to allow post commands to access this method.
@app.route("/voyager/query/<query>", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def voyager_query(query):
	
	if(query == 'records'):
		country = request.values.get('country', type=str)
		region = request.values.get('region', type=str)
		if(country == None or (region == '')):
			return "No name provided", 404
	
	return '', 404