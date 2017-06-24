from the_root.extensions import db
import datetime
from shutil import copyfile
import PIL.Image
from flask import current_app
import os

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
	tmpcanvasid = db.Column(db.Integer)
	
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
		
class Canvas(db.Model):
	
	__tablename__ = "canvas"
	
	id = db.Column(db.Integer, nullable=False, unique=True, primary_key=True, autoincrement=True)
	name = db.Column(db.String(64))
	author = db.Column(db.Integer, nullable=False)
	date = db.Column(db.Date)
	orientation = db.Column(db.Boolean)
	
	#Creates a canvas with the date set to now.
	#An author MUST be provided, but name and orientation have defaults.
	def __init__(self, author, name='Unnamed', orientation=0):
		self.name = name
		self.author = author
		self.date = datetime.datetime.now()
		self.orientation = orientation
		
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)
		
	#simply makes a new set of blank files for self canvas. The canvas ID must have been set to do self.
	def prepBlank(self):
		copyfile(current_app.config['STATIC_CONTENT_ROOT'] + '/projector/canvas/blankI.png', self.getFilename('I'))
		copyfile(current_app.config['STATIC_CONTENT_ROOT'] + '/projector/canvas/blankT.jpg', self.getFilename('T'))
		copyfile(current_app.config['STATIC_CONTENT_ROOT'] + '/projector/canvas/blankE.json', self.getFilename('E'))
		
	#Gets the absolute path to the file where self canvas is located, depending on the type of data you want to collect.
	#type == 'I' will get the projection image path, 'T' will get the thumbnail image path, and 'E' will get the editable JSON path.
	#app -- a reference to the app engine, for config purposes
	def getFilename(self, type):
		return current_app.config['STATIC_CONTENT_ROOT'] + self.getPath(type)
		
	#Gets the path relative to the static root.
	def getPath(self, type):
		ext = None
		if(type=='I'):
			ext = 'png'
		elif(type=='T'):
			ext = 'jpg'
		elif(type=='E'):
			ext = 'json'
		else:
			return None
		return '/projector/canvas/' + str(self.id) + type + '.' + ext

class DeviceRegistry(db.Model):
	
	__tablename__ = "devreg"
	
	userid = db.Column(db.Integer, nullable=False, primary_key=True)
	deviceid = db.Column(db.Integer, nullable=False, primary_key=True)
	
	#Creates a device-owner pair in the register.
	def __init__(self, userid, deviceid):
		self.userid = userid
		self.deviceid = deviceid
		
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)
	
class StockImage(db.Model):
	
	__tablename__ = "stockimg"
	
	id = db.Column(db.Integer, nullable=False, unique=True, primary_key=True, autoincrement=True)
	name = db.Column(db.String(64))
	catid = db.Column(db.Integer, nullable=False)
	userid = db.Column(db.Integer)
	
	#Creates a new stock image. Params:
	#catid - id of image category. Required.
	#userid - 'Owner' if the image is private. Optional, do not supply for public
	#name - Optional, should be supplied for public.
	def __init__(self, catid, userid=None, name='Unnamed'):
		self.catid = catid
		self.userid = userid
		self.name = name
		
	#file - request.files['file'] object. Required. File is assumed to be validated; no validation is done here.
	#Method to create the stock image and it's thumbnail. Image instance must have been added to db before calling this method.
	#Return true if success, false if unsupported
	def setImage(self, file):
		file.save(self.getImagePath())
		size = (100,100)
		im = PIL.Image.open(self.getImagePath())
		im.thumbnail(size, PIL.Image.ANTIALIAS)
		background = PIL.Image.new('RGBA', size, 'white')
		background.save(current_app.config['STATIC_CONTENT_ROOT'] + '/projector/stock/test.jpg', "JPEG")
		#Note for future reference. If mask is not set equal to the transparency-containing image in question, it will paste black instead
		if(im.mode == 'RGBA'):
			background.paste(im, ((int(size[0] - im.size[0]) / 2), (int(size[1] - im.size[1]) / 2)), mask=im)
		else:
			background.paste(im, ((int(size[0] - im.size[0]) / 2), (int(size[1] - im.size[1]) / 2)))
		background.save(self.getThumbnailPath(), "JPEG")
		return True
		
	#Adds tags to this stock image. 'tags' is a simple string, where tags are delimited by the space character ' '
	def addTags(self, tags, commit=True):
		for tagstr in tags.split(' '):
			tag = StockImageTag(self.id, tagstr)
			db.session.add(tag)
		if(commit): db.session.commit()
	
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)
		
	#Gets the *absolute* filesystem path to the image file.
	def getImagePath(self):
		return current_app.config['STATIC_CONTENT_ROOT'] + '/projector/stock/' + str(self.id) + 'I.png'
		
	def getThumbnailPath(self):
		return current_app.config['STATIC_CONTENT_ROOT'] + '/projector/stock/' + str(self.id) + 'T.jpg'
		
class StockImageCategory(db.Model):
	
	__tablename__ = "stockcat"
	
	id = db.Column(db.Integer, nullable=False, unique=True, primary_key=True, autoincrement=True)
	name = db.Column(db.String(64))
	userid = db.Column(db.Integer, nullable=True) # This is specifically allowed to be null (for public cats)
	
	#Creates a new stock image category. If userid is not defined explicitly a public category
	#will be created.
	def __init__(self, name='Unnamed', userid=None):
		self.name = name
		self.userid = userid
		
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)
		
class StockImageTag(db.Model):
	
	__tablename__ = "stocktags"
	
	id = db.Column(db.Integer, nullable=False, primary_key=True) # The stock image id
	tag = db.Column(db.String(32), nullable=False, primary_key=True) # The text-based tag associated with it, for search purposes.
	
	
	#A tag must be provided.
	def __init__(self, id, tag):
		self.id = id
		self.tag = tag
		
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)
		
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

class Privilege(db.Model):
	
	__tablename__ = "priv"
	
	userid = db.Column(db.Integer, nullable=False, primary_key=True) # The stock image id
	tag = db.Column(db.String(32), nullable=False, primary_key=True) # The text-based tag associated with it, for search purposes.
	
	
	#A tag must be provided.
	def __init__(self, id, tag):
		self.id = id
		self.tag = tag
		
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)
#		


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



















