#This handles optional routes which only apply on the dev server.
#THIS FILE WILL NEVER SEE THE LIGHT OF DAY if app.config['DEBUG'] is not true

import flask

from flask import render_template, redirect, send_from_directory
from the_root import app
'''
#This is a debug function which redirects :5000 requests to :80. This allows code to run on the dev server (Flask, port 5000)
#but pull images off the NGinX server (port 80)
@app.route("/static/<folder>/<path:code>", methods=['GET', 'POST', 'OPTIONS'])
def static_redirect(folder, code):
	str = "http://dev.myluxedo.com/static/" + folder + "/" + code
	print 'DEBUG REDIRECTING TO: ' + str
	return redirect(str)
'''

#This is a debug funtion that allows the serving of static files via flask for development purposes.
@app.route("/staticlocal/<path:path>", methods=['GET', 'POST', 'OPTIONS'])
def static_local(path):
	#print 'DEBUG: Statically serving image at /static/' + path
	return send_from_directory('static', path)