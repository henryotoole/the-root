from the_root.extensions import db
import datetime
from shutil import copyfile
import PIL.Image
from flask import current_app
from flask_login import login_required, current_user
from datetime import date

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
	is_anonymous = False
	
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
	
	def get_id(self):
		return self.id
		
		
	#Tells us if this user is an admin
	def is_admin(self):
		if not Privilege.query.filter_by(userid=self.id).filter_by(tag='admin').first(): # If no admin tag for this user.
			return False
		return True
		
	#Return true if the user has the privilege tag provided.
	def has_privilege(self, priv):
		if not Privilege.query.filter_by(userid=self.id).filter_by(tag=priv).first(): # If no admin tag for this user.
			return False
		return True

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
	method = db.Column(db.Integer, nullable=False)									# ID of Method (see Method)

	#Create a new record. Amount, income, and type are required. Does not add to database.
	def __init__(self, amt, income, type, method, srcdest = None, desc = None):
		self.amt = amt
		self.income = income
		self.type = type
		self.method = method
		
		self.time = datetime.datetime.now()
		self.user = current_user.id
		
		self.srcdest = srcdest
		self.desc = desc
	
	#Gets all entries for a single date, in the form of a list. Date should be a datetime object.
	@staticmethod
	def getDate(date):
		date_end = date
		date_start = date - datetime.timedelta(days=1)
		records = Transaction.query.filter_by(user=current_user.id).filter(Transaction.time<=date_end).filter(Transaction.time>=date_start).all()
		list = [record.getDict() for record in records]
		return list
		
	#Gets the balance for the current logged in user
	@staticmethod
	def getBalance():
		sum = 0
		records = Transaction.query.filter_by(user=current_user.id)
		for record in records:
			if(record.income):
				sum += record.amt
			else:
				sum -= record.amt
		return sum
		
	#Gets the balance for the current logged in user
	@staticmethod
	def getBalanceUpTo(date):
		sum = 0
		date_crit = date - datetime.timedelta(days=1)
		records = Transaction.query.filter_by(user=current_user.id).filter(Transaction.time<=date_crit)
		for record in records:
			if(record.income):
				sum += record.amt
			else:
				sum -= record.amt
		return sum
	
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
		
	#Get a string representation of this entry.
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)
	
class Method(db.Model):
	
	__tablename__ = "trans_method"
	
	id = db.Column(db.Integer, unique=True, primary_key=True, autoincrement=True)	# Unique ID
	name = db.Column(db.String(32), nullable=True)									# Name of this method (e.g. cash, debit, etc.)
	
	
	def __init__(self, name):
		self.name = name
		
	#Get a string representation of this entry.
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)

class UntetherNote(db.Model):
	
	__tablename__ = "untether_note"
	
	id = db.Column(db.Integer, unique=True, primary_key=True, autoincrement=True)	# Unique ID
	name = db.Column(db.String(256), nullable=False)								# Name of this note (unique to user)
	user = db.Column(db.Integer, nullable=False)									# The user who this note belongs to
	cat = db.Column(db.Integer, nullable=True)										# The category this note belongs in (if null, no cat)
	pos = db.Column(db.Integer, nullable=True)	# The 'position' this note occupies in whatever category it belongs in. Null for unsorted
	enc = db.Column(db.Boolean) # Whether the file is encrypted.
	
	
	def __init__(self, name, user, cat=None):
		self.name = name
		self.user = user
		self.cat = cat
		self.enc = 0
		
	def getNoteSysFilepath(self):
		return current_app.config['USER_FILE_ROOT'] + '/untether/notes/note' + str(self.id) + '.txt'
		
	#Gets the full text (as a string) of this note. If the file doesn't exist, create it and return an empty string
	def getText(self):
		try:
			with open(self.getNoteSysFilepath(), 'r') as file:
				return file.read()
		except IOError:
			with open(self.getNoteSysFilepath(), 'w') as file:
				return ''
		
	#Sets the full text of this note, given a string argument. Size restriction is assumed to happen BEFORE this step.
	def setText(self, text):
		with open(self.getNoteSysFilepath(), 'w') as file:
			file.write(text)
		
	#Get a string representation of this entry.
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)
		
class UntetherCat(db.Model):
	
	__tablename__ = "untether_cat"
	
	id = db.Column(db.Integer, unique=True, primary_key=True, autoincrement=True)	# Unique ID
	name = db.Column(db.String(256), nullable=False)								# Name of this category, unique to user
	user = db.Column(db.Integer, nullable=False)									# The user who this category belongs to
	cat = db.Column(db.Integer, nullable=True)										# The ID of another cat, if this cat is nested.
	pos = db.Column(db.Integer, nullable=True)	# The 'position' this cat occupies in whatever category it belongs in. Null for unsorted
	
	def __init__(self, name, user, cat):
		self.name = name
		self.user = user
		self.cat = cat # Note: Cat can be None.
		
	#Get a string representation of this entry.
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)
		
class VoyagerRecord(db.Model):
	
	__tablename__ = "voyager_record"
	
	id = db.Column(db.Integer, unique=True, primary_key=True, autoincrement=True)	# Unique ID
	name = db.Column(db.String(256))										# Name of place/location/adventure
	user = db.Column(db.Integer, nullable=False)							# ID of user who 'owns' this
	type = db.Column(db.Integer, nullable=False)							# Type of place/location/adventure (ID, see voyager_type)
	country = db.Column(db.String(128), nullable=False)						# Name of country. Must be provided
	region = db.Column(db.String(128))										# Name of region. Optional
	latitude = db.Column(db.Numeric(precision=7, scale=4), nullable=True)				# Latitude, optional. XXX.XXXX
	longitude = db.Column(db.Numeric(precision=7, scale=4), nullable=True)				# Longitude, optional. XXX.XXXX
	#Note, notes and images for a record stored in static directory. Country and region are saved mostly just
	#to make it easier to sort locations by ... hmm need to think about this later.
	
	def __init__(self, name, user, type, country, region=None, latitude=None, longitude=None):
		self.name = name
		self.user = user
		self.type = type
		self.country = country
		self.region = region
		self.latitude = latitude
		self.longitude = longitude

class VoyagerType(db.Model):
	
	__tablename__ = "voyager_type"
	
	id = db.Column(db.Integer, unique=True, primary_key=True, autoincrement=True)	# Unique ID
	user = db.Column(db.Integer, nullable=False)							# ID of user who 'owns' this
	name = db.Column(db.String(256))										# Name of type
	
	def __init__(self, name, user):
		self.name = name
		self.user = user
		
	#Get a string representation of this entry.
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)

class StackEntry(db.Model):

	__tablename__ = "stack_entry"
	
	id = db.Column(db.Integer, unique=True, primary_key=True, autoincrement=True)	# Unique ID
	user = db.Column(db.Integer, nullable=False)							# ID of user who 'owns' this
	cat_id = db.Column(db.Integer, nullable=False)							# ID of category this belongs to
	name = db.Column(db.String(256), nullable=False)						# Name of type
	deadline = db.Column(db.Integer, nullable=False)						# Days since 1 January 1970 (including 1 January)
	deadline_soft = db.Column(db.Boolean, nullable=False, default=True) 	# Whether the deadline is soft (true) or hard (false)
	day_completed = db.Column(db.Integer, nullable=False)					# Days since 1 Jan 1970 that the entry was completed on.
	has_notes = db.Column(db.Boolean, nullable=False, default=False) 		# Whether notes exist on file
	completed = db.Column(db.Boolean, nullable=False, default=False) 		# Whether note has been completed.
	priority = db.Column(db.Integer, nullable=False)						# Determines position in a day's column. -1 means not set
	
	def __init__(self, name, deadline, cat_id, soft):
		self.name = name
		self.user = current_user.id
		self.deadline = deadline
		self.cat_id = cat_id
		self.deadline_soft = soft
		self.priority = -1
		self.day_completed = -1 # Signifies that there is not a day completed set.
	
	# Gets all entries for a specific day. This includes entries from other days which have not been completed. Or, more specifically:
	# 	- get all SOFT COMPLETED entries which have been completed on that day AND
	#	- get all HARD entries which have deadlines on that day AND
	#	- get all SOFT INCOMPLETED entries which have deadlines before or on today.
	# Note that behavior is even a little more specialized due to the distinction between 'today' and 'target day'. See comments
	# below for more details.
	@staticmethod
	def get_all_for_day(day, today):
		# Hard and completed entries ALWAYS and ONLY show up on their relevant day.
		hard_entries = StackEntry.query.filter(StackEntry.deadline==day).filter(StackEntry.deadline_soft==False).all()
		#If day_comp != -1 its complete.
		soft_completed = StackEntry.query.filter(StackEntry.day_completed==day).filter(StackEntry.deadline_soft==True).all()
		if day == today: # If we are looking at the CURRENT day
			# Load all not-yet-complete entries
			soft_incomplete = StackEntry.query.filter(StackEntry.completed==False).filter(StackEntry.deadline <= day).filter(StackEntry.deadline_soft==True).all()
		elif day > today: # we are looking into the future
			# Load only not-yet-completes which are set to be done this day.
			soft_incomplete = StackEntry.query.filter(StackEntry.completed==False).filter(StackEntry.deadline == day).filter(StackEntry.deadline_soft==True).all()
		else: # We are looking into the past
			# There are no soft incomplete entries in the past
			soft_incomplete = []
		all_entries = hard_entries + soft_completed + soft_incomplete
		entry_list = []
		for entry in all_entries:
			entry_list.append(entry.getDict())
		for entry in entry_list:
			print "id: " + str(entry['id'])
		return entry_list
		
	# Hey, this can't be done here because we've  not got timezone info. I'm leaving this function
	# as a reminder, but it does nothing
	def days_since_1jan1970(self):
		pass
		
	#Get a string representation of this entry.
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)
		
class StackCat(db.Model):
	
	__tablename__ = "stack_cat"
	
	id = db.Column(db.Integer, unique=True, primary_key=True, autoincrement=True)	# Unique ID
	user = db.Column(db.Integer, nullable=False)									# ID of user who 'owns' this
	name = db.Column(db.String(64))													# Name of category
	
	def __init__(self, name):
		self.name = name
		self.user = current_user.id
		
	#Get a string representation of this entry.
	def __repr__(self):
		return getStr(self)
		
	#Gets the row as a dictionary {colName1: colVal1, colName2: colVal2, ... ETC}
	#May have to add compatibility for DateTime and other expressions later.
	#Columns, if provided, should be a list of column names to include. Otherwise will return all.
	def getDict(self, columns=None):
		return getDict(self, columns)


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

















