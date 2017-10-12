from the_root import app

import flask, os
from flask import render_template, send_file, jsonify

from bs4 import BeautifulSoup

@app.route("/projects")
def projects():
	return render_template("/projects/projects.html", sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])

#Mostly public methods
@app.route("/projects/query/<query>")
def proj_query(query):
	
	#Scan all files in the project directory and check if they have proper meta tags. If they do, return a dict
	#for each in a jsonified list.
	#NOTE: The url returned is relative to the static directory.
	if(query == 'project_meta_all'):
		
		script_path = os.path.dirname(os.path.realpath(__file__)) # no trailing slash
		proj_dir = script_path + "/static/projects"
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