from the_root.extensions import db
import datetime
from shutil import copyfile
import PIL.Image
from flask import current_app
from flask_login import login_required, current_user

import os
import statistics

#General models notes
#==================================================================================================
#commits: db.session.commit() can and should be called in a model method if needed; however an argument
#		  for that function should suppress the commit if present, allowing upstream functions to 
#		  perform multiple operations without committing every time.


#The 'user' table.
class User(db.Model):

	#This tells the User class what the table should be named/is named.
	__tablename__ = 'user'
	
	id = db.Column(db.Integer, nullable=False, unique=True, primary_key=True, autoincrement=True)
	passhash = db.Column(db.String(255))
	email = db.Column(db.String(255), unique=True, nullable=False)
	
	#Notes about insert/delete/etc commands
	#http://flask-sqlalchemy.pocoo.org/2.1/queries/
	
	def __init__(self, password, email):
		from passlib.hash import bcrypt_sha256
		self.passhash = bcrypt_sha256.hash(password)
		self.email = email
	
	#Returns true if the provided password is that of the user.
	def validate_password(self, password):
		from passlib.hash import bcrypt_sha256
		return bcrypt_sha256.verify(password, self.passhash)
	
	#repr retusna  printable representation of the object. Similar to __str__
	def __repr__(self):
		return '<User ID: %r>' % (self.id)
		
	#Define methods for flask-login
	def is_active(self):
		return True
		
	def is_authenticated(self):
		return True
		
	def is_anonymous(self):
		return False
	
	def get_id(self):
		return self.id
		
class Transaction(db.Model):
	
	__tablename__ = "transaction"
	
	id = db.Column(db.Integer, unique=True, primary_key=True, autoincrement=True)	# Unique ID
	amt = db.Column(db.Numeric(precision=11, scale=2), nullable=False)				# The amount in dollars
	income = db.Column(db.Boolean, nullable=False)									# Whether it's income (1 if income)
	type = db.Column(db.Integer, nullable=False)									# ID of Type (see Type)
	time = db.Column(db.DateTime, nullable=False)									# Time of notification of transaction
	srcdest = db.Column(db.String(127), nullable=True)								# The optional source or destination (i.e. Kroger's)
	desc = db.Column(db.String(255), nullable=True)									# An optional description
	user = db.Column(db.Integer, nullable=False)									# The user who made this record

	#Create a new record. Amount, income, and type are required. Does not add to database.
	def __init__(self, amt, income, type, srcdest = None, desc = None):
		self.amt = amt
		self.income = income
		self.type = type
		
		self.time = datetime.datetime.now()
		self.user = current_user.id
		
		self.srcdest = srcdest
		self.desc = desc
	
	#Gets a list (strings) of up to the n most commonly used (source or destination, depending on src t/f) for the current user. 
	#If none repeat, returns the most recent.
	@staticmethod
	def get_common_srcdest(n, src):
		dests = [trans.srcdest for trans in Transaction.query.filter_by(user = current_user.id).filter_by(income = src).order_by('-time').all()] # All destinations for this user.
		print dests
		if(len(dests) < n):
			n = len(dests)
		list = []
		for c in range(n):
			if(len(dests) == 0):
				break
			dest = None
			try:
				dest = statistics.mode(dests)
			except statistics.StatisticsError: # If there is no most common object (or the set is empty, which it should not be).
				dest = dests[0]
			
			dests = [d for d in dests if d != dest] # Filter dest from the list
			list.append(dest)
		return list
	
	#Get a string representation of this entry.
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)
	
class Type(db.Model):
	
	__tablename__ = "trans_type"
	
	id = db.Column(db.Integer, unique=True, primary_key=True, autoincrement=True)	# Unique ID
	name = db.Column(db.String(32), nullable=False)									# Name of this type of transaction
	desc = db.Column(db.String(127), nullable=False)								# Short description for this trans
	income = db.Column(db.Boolean, nullable=False, default=False)					# Whether it's income
	
	def __init__(self, name, desc, income):
		self.name = name
		self.desc = desc
		self.income = income
	
class Method(db.Model):
	
	__tablename__ = "trans_method"
	
	id = db.Column(db.Integer, unique=True, primary_key=True, autoincrement=True)	# Unique ID
	name = db.Column(db.String(32), nullable=True)									# Name of this method (e.g. cash, debit, etc.)
	
	
	def __init__(self, name):
		self.name = name

class Device(db.Model):
	
	__tablename__ = "dev"
	
	id = db.Column(db.Integer, unique=True, primary_key=True, autoincrement=True)
	password = db.Column(db.String(32), nullable=False)
	version_crnt = db.Column(db.String(32))
	version_tgt = db.Column(db.String(32), nullable=False)
	fb = db.Column(db.Boolean)
	capture = db.Column(db.Boolean)
	ltrans_proj = db.Column(db.DateTime, nullable=False)
	ltrans_edit = db.Column(db.DateTime, nullable=False)
	cfg_update = db.Column(db.Boolean)
	actcanvasid = db.Column(db.Integer)
	name = db.Column(db.String(32))
	timeOn = db.Column(db.Time)
	timeOff = db.Column(db.Time)
	orientation = db.Column(db.String(1))
	cap_offx = db.Column(db.SmallInteger)
	cap_offy = db.Column(db.SmallInteger)
	cap_scalex = db.Column(db.Numeric(precision=4, scale=3))
	cap_scaley = db.Column(db.Numeric(precision=4, scale=3))
	watermark = db.Column(db.Boolean)
	debug = db.Column(db.Boolean)
	status = db.Column(db.String(32))
	
	#Adds a new device to the database. Required information for self action is:
	#password - a string based password generated on physical device inception. If not provided, one will be generated.
	#version_tgt - The target version the device will attempt to update to (unless it's already there). If not provided, will
	#			   get the default from app.config['PROJECTOR_TARGET_VERSION']
	#Additionaly, some fields are optional, such as
	#version_crnt - The current version of the device.
	#watermark - Disabled by default
	#debug - Disabled by default
	def __init__(self, password=None, version_tgt=None, version_crnt=None, watermark=False, debug=False):
		if(password):
			self.password = password
		else: # If no password provided.
			self.password = luxedo.passgen.getTrueRandomPassword()
		if(version_tgt):
			self.version_tgt = version_tgt
		else:
			self.version_tgt = current_app.config['PROJECTOR_TARGET_VERSION']
		self.version_crnt = version_crnt
		self.watermark = watermark
		self.debug = debug
		self.fb = False
		self.capture = False
		self.cfg_update = False
		self.actcanvasid = None
		self.name = 'New Device'
		self.timeOn = None
		self.timeOff = None
		self.orientation = '0'
		self.cap_offx = 0
		self.cap_offy = 0
		self.cap_scalex = 1.0
		self.cap_scaley = 1.0
		self.status = 'NEW' # The default status for all new devices. This will change once the device connects and updates it's status.
		self.ltrans_edit = datetime.datetime.now() # Make sure to set these.
		self.ltrans_proj = datetime.datetime.now()
		
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)
	
	#Sets the capture status of the device. Status should be boolean
	def setCapture(self, status, commit=True):
		self.capture = status
		if(commit): db.session.commit()
		
	def setCaptureImage(self, file):
		file.save(self.getCapturePath())
		
	#Called whenever the device queries the server for anything, except a flipbit for performance reasons
	def handshakeProjector(self, commit=True):
		self.ltrans_proj = datetime.datetime.now() # Simply set the last date the thing connected.
		ts = (self.ltrans_proj - self.ltrans_edit).total_seconds() # Time since last ping from an editor
		if(ts > 2.0): # If it's been two seconds since an editor pinged us.
			self.fb = False # Disable the flipbit because no editor is currently connected.
		if(commit): db.session.commit()
	
	#Called on the update interval of any interface which allows the device to be edited, currently (June 2017) just the workspace
	def handshakeEditor(self, commit=True):
		self.ltrans_edit = datetime.datetime.now() # Simply set the last date the thing connected.
		self.fb = True
		if(commit): db.session.commit()
	
	#Gets the 'status' of the device based off the last transmissions from device.
	# * active determines if we get the 'active' status or not. 'active' status checks if the device is actually connected
	#	or not; 'passive' simply gets the last status the device happened to send.
	# * wait_time is the optional amount of time (in seconds) we've been waiting for the device to respond after engaging fb.
	#	It should be provided if this is the first get status request 
	#	See ds4 - status in notebook for more info.
	def getStatus(self, active=True, wait_time=None):
		if(not active):
			return self.status
		#First check some special status types which would prevent the device from sending fb requests
		#NEW - The device has never been connected, so show this until the device pings us at least once.
		#UPDATING - The device is updating, so display this until it comes back online.
		#OFF - The device has shutdown gracefully and has to be manually turned back on.
		if(self.status == 'NEW' or self.status == 'UPDATING' or self.status == 'OFF'):
			return self.status
		ts = (datetime.datetime.now() - self.ltrans_proj).total_seconds() #Time elapsed since we last got a handshake from projector.
		if(ts < (int(current_app.config['FB_LOOP_MINTIME']) * 5)): # If the device has recently performed a handshake
			return self.status
		# It's been some time since the handshake, but we are waiting for an initial fb req	
		elif(wait_time and wait_time < (int(current_app.config['FB_LOOP_MAXTIME']) * 1.1)):
			# TODO replace 11.0 with reference for the max time between fb pings.
			return 'GETTING' # We are currently waiting for the next fb ping.
		else: # It's been long enough that the device is almost certainly having connection problems.
			return 'LOST' # The device has been lost.
	
	#Gets a list of commands for the pi to execute, depending on it's current state in the database.
	#A command is a dict with the structure: {id: X, arg1: val, arg2, val2, ...}
	#Command ID's are string
	#id: CANVAS			path: path to canvas, from root			time: a current timestamp
	#id: CAPTURE
	#id: UPDATE_VSN		path: path to update buildtar
	#id: UPDATE_CFG		cfg: a dict of config key/values
	#This function commits.
	def getCommands(self, dev_version, last_timestamp, commit=True):
		list = []
		canvas = Canvas.query.filter_by(id=self.actcanvasid).first()
		if(canvas): #If the canvas exists 
			current_timestamp = os.path.getmtime(canvas.getFilename('I'))
			if(not(str(last_timestamp) == str(current_timestamp))): # If the canvas has changed since we last sent it off.
				list.append({'id': 'CANVAS', 'path': canvas.getPath('I'), 'time': current_timestamp})
		if(self.capture):
			list.append({'id': 'CAPTURE'})
		if(self.version_crnt != dev_version):
			self.version_crnt = dev_version
			if(commit): db.session.commit()
		if(self.version_tgt != self.version_crnt):
			list.append({'id': 'UPDATE_VSN', 'path': self.getTargetFirmwarePath()})
			print '---------------------------------------------------------' + self.getTargetFirmwarePath()
		if(self.cfg_update):
			list.append({'id': 'UPDATE_CFG', 'cfg': self.getConfig()})
		
		return list
		
	#Get a list of configuration key/value pairs, in the form of a single dict {key1: val1, key2: val2, ...}
	#Defaults are handled here.
	def getConfig(self):
		dict = {}
		dict['screen_rotation'] = self.orientation
		dict['time_on'] = self.timeOn or 'UNSET'
		dict['time_off'] = self.timeOff or 'UNSET'
		dict['capture_offset_x'] = self.cap_offx
		dict['capture_offset_y'] = self.cap_offy
		dict['capture_scale_x'] = self.cap_scalex
		dict['capture_scale_y'] = self.cap_scaley
		dict['debug_overlay_enabled'] = self.debug
		dict['watermark_enabled'] = self.watermark
		dict['fb_loop_mintime'] = current_app.config['FB_LOOP_MINTIME']
		dict['fb_loop_maxtime'] = current_app.config['FB_LOOP_MAXTIME']
		return dict
		
	#Gets the *absolute* filesystem path to the capture file. This method is deceprecated, and will soon be replaced by streaming.
	def getCapturePath(self):
		return current_app.config['STATIC_CONTENT_ROOT'] + '/projector/device/' + str(self.id) + 'C.jpg'
	
	#Gets the RELATIVE device's target version path. Checks if the buildtar exists, and if it doesn't returns
	#the path to the luxedo config global target version instead.
	def getTargetFirmwarePath(self):
		path = self.getFirmwarePath(self.version_tgt)
		if(not os.path.isfile(current_app.config['STATIC_CONTENT_ROOT'] + path)):
			path = self.getFirmwarePath(current_app.config['PROJECTOR_TARGET_VERSION'])
		print current_app.config['STATIC_CONTENT_ROOT'] + path
		return current_app.config['STATIC_CONTENT_ROOT'] + path
	
	#Get's the RELATIVE path to the firmware bundle for the provided version. Relative to static content root.
	#Version such as 1.0.2, or 1.22.0 (strings)
	def getFirmwarePath(self, version):
		return '/projector/firmware/pi_buildtar_v' + version + '.tar.gz'


#========================== FUNCTIONS FOR MANIPULATING MODELS ==========================
#You can't do proper inheritance with models under SQL Alchemy, so I've resorted to self


#Gets a string representation of the object
def getStr(dbinstance):
	out = "<TABLE " + dbinstance.__tablename__ + " ENTRY>"
	for column in dbinstance.__table__.columns:
		val = str(getattr(dbinstance, column.name))
		out = out + column.name + ": " + val + ", "
	return out
	
#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#keep, if provided, should be a list of column names to include. Otherwise will return all.
def getDict(dbinstance, keep=None):
	d = {}
	for column in dbinstance.__table__.columns:
		if keep==None:
			d[column.name] = str(getattr(dbinstance, column.name))
		elif column.name in keep:
			d[column.name] = str(getattr(dbinstance, column.name))

	return d

#EOF



















