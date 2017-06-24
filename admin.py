#This file handles general admin functions.

from luxedo.forms import DeviceCreateForm, CSRFForm
from luxedo.models import Device, StockImageCategory, StockImage, DeviceRegistry, User
from luxedo.decorators import admin_required
from luxedo.extensions import db
from luxedo import app

import flask
from flask_login import login_required, login_user, logout_user, current_user
from werkzeug.utils import secure_filename

import os

from flask import render_template, request, jsonify
	
@app.route("/admin", methods=['GET', 'POST'])
@login_required
@admin_required
def admin():
	return render_template("/admin/admin.html")
	

#NOTE!!: If both GET and POST are not allowed, wtforms will trip a 405 error.
@app.route("/admin/device_create", methods=['GET', 'POST'])
@login_required
@admin_required
def device_create():
	form = DeviceCreateForm()
	if form.validate_on_submit():
		qty = form.number.data
		list = []
		if(qty < 1):
			return "Invalid quantity: " + str(qty)
		for i in range(qty):
			ndev = Device()
			db.session.add(ndev)
			db.session.flush()
			print ndev.id
			#Return id and pass to user
			list.append({'id':ndev.id, 'password':ndev.password})
		
		db.session.commit()
		return render_template('/admin/device_list.html', dev_list=list)
	else:
		return render_template('/admin/device_create.html', form=form)

#Utility which lists indicated devices and allows administrative control over them.
@app.route("/admin/device_control/<query>", methods=['GET', 'POST'])
@login_required
@admin_required
def device_control(query):
	if(query=='load'):
		sp_local = app.config['STATIC_URL_LOCAL']
		sp_content = app.config['STATIC_URL_CONTENT']
		return render_template('/admin/device_control.html', sp_local=sp_local, sp_content=sp_content)
	elif(query=='dev_get'):
		#Validate queried Device
		#Note, args is a dictionary, so args.get is a default python function.
		dev_id = request.values.get('dev_id', type=int) #Default will be None.
		dev_email = request.values.get('dev_email', type=str) #Default will be None.
		if(dev_id):
			dev = Device.query.filter_by(id=dev_id).first()
			if(not dev): return "No dev of provided id.", 404
			dict = dev.getDict(['id','fb','password','actcanvasid','capture','name','version_crnt', 'version_tgt', 'status', 'cfg_update'])
			return jsonify(dict), 200
		elif(dev_email):
			user = User.query.filter_by(email=dev_email).first()
			if(not user): return "Not valid email", 404
			regs = DeviceRegistry.query.filter_by(userid=user.id)
			list = []
			for reg in regs:
				dev = Device.query.filter_by(id=reg.deviceid).first()
				list.append(dev.getDict(['id','fb', 'password','actcanvasid','capture','name','version_crnt', 'version_tgt', 'status', 'cfg_update']))
			return jsonify(list), 200
		else: return "No dev identifier provided", 404
	elif(query=='dev_cue_cfg_all'):
		Device.query.update({Device.cfg_update: True, Device.fb: True}) # Updates all records efficiently, in one command.
		db.session.commit()
		return jsonify({}), 200
	
#Serve the stock batch page
@app.route("/admin/stock_batch", methods=['GET', 'POST'])
@login_required
@admin_required
def stock_batch():
	form = CSRFForm() # An empty form for the CSRF
	sp_local = app.config['STATIC_URL_LOCAL']
	sp_content = app.config['STATIC_URL_CONTENT']
	return render_template('/admin/stock_batch.html', sp_local=sp_local, sp_content=sp_content, form=form)
	
#Handle any admin level AJAJ queries.

@app.route("/admin/query/<query>", methods=['GET', 'POST'])
@login_required
@admin_required
def stock_upload(query):

	if(query=='stock_create'):
		#This is a method which allows the upload of a new stock image via AJAX. The upload process
		#will likely need to be run via javascript to make the process faster and more intuitive.
		name = request.values.get('name', type=str) # Name is required.
		cat_id = request.values.get('cat_id', type=int) # The category ID. Only optional if 'new_cat' is provided
		new_cat = request.values.get('new_cat', type=str) # The name of a new category. If present, cat_id is ignored.
		tags = request.values.get('tags', default='', type=str) # A list of tags delimited by spaces. Optional
		if(not name): return "No name provided", 404
		dict = {}
		if(new_cat):
			cat = StockImageCategory(name=new_cat) # no user id, makes public category.
			db.session.add(cat)
			db.session.flush()
			cat_id = cat.id
			dict['new_cat_id'] = cat_id
			dict['new_cat_name'] = new_cat
		if(not cat_id): return "No category info provided", 404
		img = StockImage(cat_id, name=name) # Do not supply userid so as to make 'public'
		db.session.add(img)
		db.session.commit()
		dict['id'] = img.id
		
		#Get file from upload
		if 'file' not in request.files:	return "No file in files", 404
		file = request.files['file']
		if not file.filename: "No selected file", 404
		print file.filename
		filename = secure_filename(file.filename)
		if not os.path.splitext(filename)[1].lower() in ['.png', '.jpg']:
			return jsonify({'errmsg': 'Invalid image format'}) # If they try to upload something other than an image.
		
		img.setImage(file)
		img.addTags(tags)
		
		return jsonify(dict), 200
	
	return "Bad query", 404