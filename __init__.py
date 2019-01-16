import flask
import flask_login
import flask_sqlalchemy
import flask_wtf
from flask import Flask

import the_root.extensions as ext

import ConfigParser # by the way, safeconfigparser simply allows formatted strings to refer to other key/values. Not needed here.

#Sets up the extensions and other path-containing files in this module
def setup():
	#Configure this server instance (sets constant strings)
	app.config.from_envvar('MASTER_FGN_CONFIG')
	load_local_config(app)
	register_extensions(app)
	#Import all path-containing files
	import the_root.landing	# The landing and login pages
	import the_root.bookkeeper # An app for handling finances.
	import the_root.untether # An app for taking notes.
	import the_root.voyager # An app for keeping track of future adventure ideas.
	import the_root.thestack # A simple web app to handle task managment and capture/release productive potential.
	import the_root.projects # The project viewer app
	import the_root.archive # The archive portion of the site.
	import the_root.serverop # A set of functions for running servers via flask as an interface and controller
	import the_root.account # Handles all outward-facing accounts stuff
	import the_root.admin # Admin stuff and admin decorator
	#Setup debug, if necessary.
	if(app.config['DEBUG']):
		import the_root.debug

#We register extensions in this way to prevent circular import references. Simply provides a
#reference to 'app' to each extension.
def register_extensions(app):
	ext.db = flask_sqlalchemy.SQLAlchemy(app)
	ext.login_manager.init_app(app)
	ext.csrf.init_app(app)
	
#Loads the device section of the_root/local.cfg file into the configuration. This local file can be reloaded without restarting
#the server, by calling this function.
def load_local_config(app):
	cfg = ConfigParser.ConfigParser()
	cfg.optionxform = str # If optionxform is not overridden, it will convert all config entries to lower case.
	cfg.read(app.root_path + "/local.cfg")
	for keypair in cfg.items('Device'):
		# print "Adding keypair: " + keypair[0] + ", " + keypair[1]
		app.config[keypair[0]] = keypair[1]


#This code is called whenever the module is imported, OR
#When gunicorn calls this in the command
app = Flask(__name__, static_url_path='') # The static url path is set here so we can serve static files for the dev server.
setup()