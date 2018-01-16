#projects.py
#
#Copyright (C) 2017  Joshua Reed
#This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.


from the_root import app
from the_root.decorators import render_template_standard

import flask, os
from flask import render_template, send_file, jsonify, current_app

from bs4 import BeautifulSoup

@app.route("/projects")
def projects():
	return render_template_standard("/projects.html")

#Mostly public methods
@app.route("/projects/query/<query>")
def proj_query(query):
	
	#Scan all files in the project directory and check if they have proper meta tags. If they do, return a dict
	#for each in a jsonified list.
	#NOTE: The url returned is relative to the static directory.
	if(query == 'project_meta_all'):
		
		script_path = os.path.dirname(os.path.realpath(__file__)) # no trailing slash
		proj_dir = current_app.config['STATIC_CONTENT_ROOT'] + "/projects"
		proj_list = []
		for filename in os.listdir(proj_dir):
			file_text = ""
			blank, file_ext = os.path.splitext(filename)
			try:
				with open(proj_dir + "/" + filename, 'r') as file:
					file_text = file.read()
				soup = BeautifulSoup(file_text, 'html.parser')
				proj_id = soup.find("meta",  property="proj_id")
				proj_name = soup.find("meta",  property="proj_name")
				cat_id = soup.find("meta",  property="cat_id")
				#All properties must exist for valid project file.
				if(proj_id and proj_name and cat_id):
					dict = {
						"proj_id": proj_id['content'], 
						"proj_name": proj_name['content'], 
						"cat_id": cat_id['content'],
						"url": "/projects/" + filename
					}
					proj_list.append(dict)
			except IOError: #Probably a folder, should be ignored.
				pass
		return jsonify(proj_list), 200