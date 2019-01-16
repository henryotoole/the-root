#thestack.py
#
#This is a simply web app to handle task managment and capture/release productive potential.
#
#Copyright (C) 2017  Joshua Reed
#This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.

from the_root.extensions import db, csrf
from the_root import app
from the_root.models import StackEntry, StackCat
from the_root.decorators import render_template_standard

import flask
from flask_login import login_required, current_user

from flask import render_template, redirect, request, jsonify
import json

@app.route("/stack", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anon users can log in
def thestack():
	return render_template_standard("/stack/thestack.html")
	
@csrf.exempt # This is added to allow post commands to access this method.
@app.route("/stack/query/<query>", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def stack_query(query):
	
	if(query=='cat_get_all'): # Get a JSON list of all categories
		list = []
		cats = StackCat.query.filter_by(user=current_user.id)
		for cat in cats:
			list.append(cat.getDict())
		return jsonify(list), 200
	elif(query=='cat_create'):
		name = request.values.get('name', type=str)
		if(name == None or (name == '')):
			return "No name provided", 404
		cat = StackCat(name)
		db.session.add(cat)
		db.session.commit()
		return jsonify(cat.getDict()), 200
	elif(query=='cat_rename'):
		id = request.values.get('id', type=int)
		name = request.values.get('name', type=str)
		if(id == None or name == None or (name == '')):
			return "No name or id provided", 404
		cat = StackCat.query.filter_by(id=id).first()
		if not cat:
			return 'Invalid ID', 404
		if not (cat.user == current_user.id):
			return 'User does not own', 404
		cat.name = name
		db.session.commit()
		return jsonify(cat.getDict()), 200
	elif(query=='cat_vis'):
		id = request.values.get('id', type=int)
		hidden = request.values.get('hidden', type=int)
		if(id == None or hidden == None):
			return "No vis or id provided", 404
		cat = StackCat.query.filter_by(id=id).first()
		if not cat:
			return 'Invalid ID', 404
		if not (cat.user == current_user.id):
			return 'User does not own', 404
		cat.hidden = hidden
		db.session.commit()
		return jsonify(cat.getDict()), 200
	elif(query=='update_cat_visibilities'):
		cat_list_jsonstr = request.values.get('cat_list_jsonstr', type=str)
		if(cat_list_jsonstr == None):
			return "No data provided", 404
		cat_list = []
		try:
			cat_list= json.loads(cat_list_jsonstr)
		except ValueError:
			return "Incorrect JSON string", 404
		for cat in cat_list:
			entry_db = StackCat.query.filter_by(id=cat['id']).first()
			if not (entry_db.user == current_user.id):
				return 'User does not own', 404
			if not cat.get('hidden') is None: entry_db.hidden = cat['hidden']
		db.session.commit()
		return jsonify({}), 200
	elif(query=='cat_del'):
		id = request.values.get('id', type=int)
		shift_id = request.values.get('shift_id', type=int)
		if(id == None):
			return "No id provided", 404
		cat = StackCat.query.filter_by(id=id).first()
		if not cat:
			return 'Invalid ID', 404
		if not (cat.user == current_user.id):
			return 'User does not own', 404
		entries = StackEntry.query.filter_by(cat_id=id).all()
		new_cat = StackCat.query.filter_by(id=shift_id).first()
		if (not shift_id==None) and (not new_cat or not (new_cat.user == current_user.id)):
			return 'Bad migration id', 404
		for entry in entries:
			if(shift_id==None):
				db.session.delete(entry)
			else: # Migrate if new cat ID provided
				entry.cat_id = shift_id
		db.session.delete(cat)
		db.session.commit()
		return jsonify({}), 200
	elif(query=='get_day'): # Get all entries with deadlines on a certain day.
		today = request.values.get('today', type=int) # The current date wherever client is, in days since Jan 1 1970
		for_day = request.values.get('for_day', type=int) # The day we want records for, in days since Jan 1 1970
		if(for_day == None or today == None):
			return "No target date provided", 404
		entry_list = StackEntry.get_all_for_day(for_day, today)
		return jsonify(entry_list), 200
	elif(query=='edit_entry'):
		id = request.values.get('id', type=int)
		cat_id = request.values.get('cat_id', type=int)
		name = request.values.get('name', type=str)
		deadline = request.values.get('deadline', type=int)
		completed = request.values.get('completed', type=int)
		priority = request.values.get('priority', type=int)
		soft = request.values.get('soft', type=int)
		current_day = request.values.get('current_day', type=int)
		if(id == None):
			return "No id provided", 404
		entry = StackEntry.query.filter_by(id=id).first()
		if not (entry.user == current_user.id):
			return 'User does not own', 404
		if not cat_id is None: entry.cat_id = cat_id
		if not name is None: entry.name = name
		if not deadline is None: entry.deadline = deadline
		if not completed is None:
			entry.completed = completed
			if completed:
				if not current_day is None:
					entry.day_completed = current_day
			else:
				entry.day_completed = -1
		if not priority is None: entry.priority = priority
		if not soft is None: entry.deadline_soft = soft
		db.session.commit()
		return jsonify(entry.getDict()), 200
	elif(query=='update_entries'): # Only cares about cat_id, name, deadline, completed, day_completed, priority, and deadline_soft
		entry_list_jsonstr = request.values.get('entry_list_jsonstr', type=str)
		if(entry_list_jsonstr == None):
			return "No data provided", 404
		entry_list = []
		try:
			entry_list= json.loads(entry_list_jsonstr)
		except ValueError:
			return "Incorrect JSON string", 404
		for entry in entry_list:
			entry_db = StackEntry.query.filter_by(id=entry['id']).first()
			if not (entry_db.user == current_user.id):
				return 'User does not own', 404
			if not entry.get('cat_id') is None: entry_db.cat_id = entry['cat_id']
			if not entry.get('name') is None: entry_db.name = entry['name']
			if not entry.get('deadline') is None: entry_db.deadline = entry['deadline']
			if not entry.get('completed') is None: 
				entry_db.completed = entry['completed']
				if entry['completed']:
					entry_db.day_completed = entry.get('day_completed', -1)
				else:
					entry_db.day_completed = -1
			if not entry.get('day_completed') is None: entry_db.day_completed = entry['day_completed']
			if not entry.get('priority') is None: entry_db.priority = entry['priority']
			if not entry.get('deadline_soft') is None: entry_db.deadline_soft = entry['deadline_soft']
		db.session.commit()
		return jsonify({}), 200
	elif(query=='create_entry'):
		name = request.values.get('name', type=str)
		deadline = request.values.get('deadline', type=int)
		soft = request.values.get('soft', type=int)
		cat_id = request.values.get('cat_id', type=int)
		if(deadline == None or soft == None or name == None or (name == '')):
			return "Missing param", 404
		entry = StackEntry(name, deadline, cat_id, soft)
		db.session.add(entry)
		db.session.commit()
		return jsonify(entry.getDict()), 200
	elif(query=='del_entry'):
		id = request.values.get('id', type=int)
		if(id == None):
			return "No id provided", 404
		entry = StackEntry.query.filter_by(id=id).first()
		if not (entry.user == current_user.id):
			return 'User does not own', 404
		db.session.delete(entry)
		db.session.commit()
		return jsonify({}), 200
	else:
		return '', 404