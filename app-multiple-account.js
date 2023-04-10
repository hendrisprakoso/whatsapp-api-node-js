// IMPORT LIB NODE JS
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
// const rimraf = require("rimraf");
const request = require('request');
const { phoneNumberFormatter, makeIdToken, allowedFile, fileIsDocument } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');


// IMPORT DEFINE LIB 
const hostname = "0.0.0.0"
const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);


// IMPORT FROM ANOTHER FILE
const { getDataListDevice, getDataDeviceByToken, addNewDevice } = require('./model/waModel');
const conDb = require('./config/mysql');


app.use(express.json());
app.use(express.urlencoded({
	extended: true
}));

app.use(fileUpload({
	debug: false
}));

app.get('/', (req, res) => {
	res.status(200).json({
		status: true, 
		message: "Service Up!"
	});
});

app.get('/scan/:id', (req, res) => {

	const vToken = req.params;
	res.sendFile('index-multiple-account.html', {
		root: __dirname
	});

});

app.get('/list-device', (req, res) => {
	res.sendFile('index-multiple-list-account.html', {
		root: __dirname
	});
});

const sessions = [];
const SESSIONS_FILE = './whatsapp-sessions.json';

const createSessionsFileIfNotExists = function() {
	if (!fs.existsSync(SESSIONS_FILE)) {
		try {
			fs.writeFileSync(SESSIONS_FILE, JSON.stringify([]));
			console.log('Sessions file created successfully.');
		} catch(err) {
			console.log('Failed to create sessions file: ', err);
		}
	}
}

createSessionsFileIfNotExists();

const setSessionsFile = function(sessions) {
	fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions), function(err) {
		if (err) {
			console.log(err);
		}
	});	
}

const getSessionsFile = function() {
	return JSON.parse(fs.readFileSync(SESSIONS_FILE));
}

const createSession = function(id, description, webhookUrl) {
	console.log('Creating session: ' + id);

	const client = new Client({
		restartOnAuthFail: true,
		qrMaxRetries: 1,
		puppeteer: {
			headless: true,
			executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-accelerated-2d-canvas',
				'--no-first-run',
				'--no-zygote',
				'--single-process', 
				'--disable-gpu',
				'--unhandled-rejections=strict',
				'--log-level=3', // new add puppeteer
				'--start-maximized',
				'--no-default-browser-check',
				'--disable-infobars', 
				'--disable-web-security',
				'--disable-site-isolation-trials',
				'--no-experiments',
				'--ignore-gpu-blacklist',
				'--ignore-certificate-errors',
				'--ignore-certificate-errors-spki-list',
				'--disable-extensions',
				'--disable-default-apps',
				'--enable-features=NetworkService'
			],
		},
		authStrategy: new LocalAuth({
			clientId: id
		})
	});

	client.initialize();

	client.on('qr', (qr) => {
		console.log(`QR RECEIVED ${description}: `, qr);

		qrcode.toDataURL(qr, (err, url) => {
			io.emit('qr', { id: id, src: url, small:true });
			io.emit('message', { id: id, status:'scan', text: 'QR Code received, scan please!' });
		});
	});

	client.on('ready', () => {
		io.emit('ready', { id: id });
		io.emit('message', { id: id, status:null, text: 'Whatsapp is ready!' });

		const savedSessions = getSessionsFile();
		const sessionIndex = savedSessions.findIndex(sess => sess.id == id);
		savedSessions[sessionIndex].ready = true;
		setSessionsFile(savedSessions);
	});

	client.on('authenticated', () => {
		io.emit('authenticated', { id: id });
		io.emit('message', { id: id, status:null, status: 'auth', text: 'Whatsapp is authenticated!' });
	});

	client.on('auth_failure', function() {
		io.emit('message', { id: id, status:null, text: 'Auth failure, restarting...' });
	});

	client.on('disconnected', (reason) => {
		console.log('in disconnected!');
		io.emit('message', { id: id, status:null, text: 'Whatsapp is disconnected!' });
		client.destroy();
		// client.initialize();

		// Menghapus pada file sessions
		const savedSessions = getSessionsFile();
		const sessionIndex = savedSessions.findIndex(sess => sess.id == id);
		// savedSessions[sessionIndex].ready = false;
		savedSessions.splice(sessionIndex, 1);
		setSessionsFile(savedSessions);

		io.emit('remove-session', id);
	});

	/*
		MESSAGE_ACK -> untuk mengetahui status message yang dikirimkan yang nantinya akan di push ke datbase dengan bantuan webhook 
		MESSAGE -> untuk mengetahui balasan dari message yang telah dikirimkan yang nantinya juga akan di push ke datbase dengan bantuan webhook 
	*/
	client.on('message_ack', async (msg) => {	
		console.log('=============== PUSH KE WEBHOOK ================');
		console.log('webhookUrl : ', webhookUrl);
		request.post({
			url:     webhookUrl,
			body : {
				type: 'message ack',
				instance :  id,
				id : msg.id.id,
				from: msg.from,
				to: msg.to,
				ack: msg.ack,
				body: msg.body,
				fromMe: msg.fromMe,
				timestamp: msg.timestamp,
			},
			json: true
		  }, function(error, response, body){
			console.log('error post : ', error);
			console.log('body post : ', body);
		  });
		console.log('================================================');

	});

	client.on('message', msg => {
		if (msg.body == '!ping') {
			msg.reply('pong');
		} else {
			console.log("response Message Reply : ", msg);
			console.log('=============== PUSH KE WEBHOOK (REPLY) ================');
			console.log('webhookUrl : ', webhookUrl);
			request.post({
				url:     webhookUrl,
				body : {
					id 			: msg.id.id,
					pushName 	: msg._data.notifyName, 
					fromMe 		: msg.fromMe,
					from 		: msg.from,
					to 			: msg.to,
					body 		: msg.body,
					timestamp 	: msg.timestamp,
					type 		: "message"
				},
				json: true
			}, function(error, response, body){
				console.log('error post : ', error);
				console.log('body post : ', body);
			});
			console.log('================================================');
		} 
	});

	/*
		Proses Pengecekan dan penambahan ke session 
		Jika session sudah pernah di tambahkan makan akan di replace dengan cara 
		Di hapus terlebih dahulu kemudian di tambahakan ke list sessions,
		-1 = menandakan data tersebut belum ada di list session
	*/
	const indexSessions = sessions.findIndex(sess => sess.id == id);
	if (indexSessions > -1) {
		sessions.splice(indexSessions, 1);	
	}
	sessions.push({
		id: id,
		description: description,
		webhookUrl: webhookUrl,
		client: client
	});

	/* Menambahkan session ke file */
	const savedSessions = getSessionsFile();
	console.log('savedSessions in Create Session : ', savedSessions);
	const sessionIndex = savedSessions.findIndex(sess => sess.id == id);

	if (sessionIndex == -1) {
		savedSessions.push({
			id: id,
			description: description,
			webhookUrl: webhookUrl,
			ready: false,
		});
		setSessionsFile(savedSessions);
	}
}

const init = function(socket) {
	const savedSessions = getSessionsFile();
	if (savedSessions.length > 0) {
		if (socket) {
			console.log('in IF SOCKET');
			/**
			 * At the first time of running (e.g. restarting the server), our client is not ready yet!
			 * It will need several time to authenticating.
			 * 
			 * So to make people not confused for the 'ready' status
			 * We need to make it as FALSE for this condition
			 */
			// savedSessions.forEach((e, i, arr) => {
			// 	arr[i].ready = false;
			// });

			socket.emit('init', savedSessions);
		} else {
			console.log('in ELSE SOCKET');
			savedSessions.forEach(sess => {
				console.log('Session saved : ', sess);
				createSession(sess.id, sess.description, sess.webhookUrl);
			});
		}
	}
}

init();

// Socket IO
io.on('connection', function(socket) {
	init(socket);

	socket.on('create-session', function(data) {
		console.log('Create session: ' + data.id);
		createSession(data.id, data.description, data.webhookUrl);
	});
});


/*
	List Router/Endpoint untuk API 
*/

/* Send message */
app.post('/send-message', async (req, res) => {
	console.log(req);

	const sender = req.body.sender;
	const number = phoneNumberFormatter(req.body.number);
	const message = req.body.message;

	const client = sessions.find(sess => sess.id == sender)?.client;

	// Make sure the sender is exists & ready
	if (!client) {
		return res.status(422).json({
			status: false,
			message: `The sender: ${sender} is not found!`
		})
	}

	const isRegisteredNumber = await client.isRegisteredUser(number);
	if (!isRegisteredNumber) {
		return res.status(422).json({
			status: false,
			message: 'The number is not registered'
		});
	}

	client.sendMessage(number, message).then(response => {
		res.status(200).json({
			status: true,
			response: response
		});
	}).catch(err => {
		res.status(500).json({
			status: false,
			response: err
		});
	});
});

/* Send Message with Image */
app.post('/send-msg-attachment', async (req, res) => {

	const sender = req.body.token;
	const number = phoneNumberFormatter(req.body.number);
	const vMessage = req.body.message;
	const fileUpload = req.files.file;
	const fileUploadIsDocument = fileIsDocument(fileUpload.name);

	// Validation for file upload extention
	if (allowedFile(fileUpload.name) === false) {
		return res.status(422).json({
			status: false,
			message: `Your file format is not Allowed! (${fileUpload.name})`
		});
	}

	const objMedia = new MessageMedia(fileUpload.mimetype, fileUpload.data.toString('base64'), fileUpload.name);

	// Inititalitation client/device/account
	const client = sessions.find(sess => sess.id == sender)?.client;

	// Validation Device is exists & ready
	if (!client) {
		return res.status(422).json({
			status: false,
			message: `The sender: ${sender} is not found!`
		})
	}
	
	// Validation number receipt is registered
	const isRegisteredNumber = await client.isRegisteredUser(number);
	if (!isRegisteredNumber) {
		return res.status(422).json({
			status: false,
			message: 'The number is not registered'
		});
	}

	/*
		Sebelum melaukan proses send message dengan attachment file 
		Sistem ada malakukan pegecekan fileupload apakah itu document (txt, pdf, xls, etc) atau media lain (jpg, jpeg, png, dll)
		Jika type fileupload adalah document makan sistem melakukan proses 2x kirim pesan
			- Pertama mengirimkan pesan untuk text (caption)
		Jika type fileupload adalah image/video maka sistem dapat langsung 1x kirim dengan menambahkan parameter { caption : <caption_message> }

		*
		Kenapa kalau file document harus 2x kirim ? 
		Karena dari library belum bisa memberikan caption ketika ada attachment document, 
		saat ini masih menunggu update dari library Whatsap-web.js

	*/

	if (fileUploadIsDocument) {

		await client.sendMessage(number, vMessage).catch(err => {
			res.status(500).json({
				status: false,
				response: err
			});
		});

	}

	client.sendMessage(number, objMedia, { sendMediaAsDocument : fileUploadIsDocument, caption : vMessage }).then(response => {
		res.status(200).json({
			status: true,
			response: response
		});
	}).catch(err => {
		console.log('ERROR : ', err);
		res.status(500).json({
			status: false,
			response: err
		});
	});
	
});

/* get list device from database */
app.post('/list-device', async (req, res) => {

	getDataListDevice((err, result) => {

		if (err) {
			res.status(500).json({
				status: false,
				message: err.code,
				results: []
			});
		}else{
			const savedSessions = getSessionsFile();

			// Matching status Ready
			if (savedSessions.length > 0) {
				result.forEach(data => {
					savedSessions.forEach(dataScan => {
						if (data.id === dataScan.id) {
							data.ready = dataScan.ready;
						}
					})
				});
			}

			res.status(200).json({
				status: true,
				message: "success",
				results: result
			});
		}

	});

});

/* Check Status Online */
app.post('/status-device', async (req, res) => {

	const sender = req.body.sender;
	// const vStatusOnline = sessions.find(sess => sess.id == sender )?.client;

	const savedSessions = getSessionsFile();
	const sessionIndex = savedSessions.find(sess => sess.id == sender);

	if (sessionIndex == undefined) {
		res.status(404).json({
			status: false,
			message: "Device DISCONNECTED!"
		});
	} else {
		if (sessionIndex.ready) {

			// Inititalitation client/device/account
			const client = sessions.find(sess => sess.id == sender)?.client;

			// Validation Device is exists & ready
			if (!client) {
				return res.status(422).json({
					status: false,
					message: `Device: ${sender} is not found!`
				})
			}
			
			// Checking for client info 
			let info = client.info;
			if (info == undefined) {
				res.status(200).json({
					status: false,
					message: "Device Connecting.."
				});	
			}else{
				res.status(200).json({
					status: true,
					message: "Device is Ready (CONNECTED)!",
					result:{
						name : info.pushname,
						user : info.wid.user,
						platform : info.platform
					}
				});
			}
		} else {
			res.status(422).json({
				status: false,
				message: "Device is not Already! plase scan again."
			});
		}
	}
});

/* Check number is Registered */
app.post('/number-registered', async (req, res) => {

	const sender = req.body.sender;
	const number = phoneNumberFormatter(req.body.number);

	const client = sessions.find(sess => sess.id == sender)?.client;

	// Make sure the sender is exists & ready
	if (!client) {
		return res.status(422).json({
			status: false,
			message: `The sender: ${sender} DISCONNECTED!`
		})
	}
	
	const isRegisteredNumber = await client.isRegisteredUser(number);

	if (!isRegisteredNumber) {
		res.status(422).json({
			status: false,
			message: 'The number is not registered on whatsapp!'
		});
	}else{
		res.status(200).json({
			status: true,
			message: 'The number is registered on whatsapp!'
		});
	}

});

/* add new device */
app.post('/add-device', async (req, res) => {
	const description = req.body.description;
	const webhookUrl = req.body.webhookUrl;
	const vGenerateToken = makeIdToken(40);


	addNewDevice(description, vGenerateToken, webhookUrl, (err, result) => {
		if (err) {
			res.status(500).json({
				status: false, 
				message: `Add new device FAILED! ${err.code}`
			});
		}else{
			res.status(200).json({
				status: true,
				message: "Add new device Successfully!"
			});
		}
	});
});

/* View detail info by Token */
app.post('/detail-device', async (req, res) => {

	var vToken = req.body.key;

	getDataDeviceByToken(vToken, (err, result) => {
		if (err) {
			res.status(500).json({
				status: false, 
				message: err,
				results: []
			});		
		}else{
			if (result.length > 0) {
				res.status(200).json({
					status: true, 
					message: "success",
					results: result
				});
				return;
			}

			res.status(404).json({
				status: false, 
				message: "Data not found!",
				results: result
			});
		}
	});
});

/* logout session */
app.post('/logout', async (req, res) => {

	var vToken = req.body.token;

	const client = sessions.find(sess => sess.id == vToken)?.client;
	if (!client) {
		res.status(404).json({
			status: false,
			id: vToken, 
			message: "Scan QR!"
		});
	}else{
		client.logout(vToken).then(resp => {
			console.log(`(id : ${vToken}) Logout Success!`);
			res.status(200).json({
				status: true,
				message: "Device Logout Successfully!"
			});

		}).catch(err => {
			console.log(`(id : ${vToken}) Logout Failed!`);
			console.log(`Logout Failed! : `, err);
			res.status(500).json({
				status: false,
				message: err
			});
		});
	}
});

server.listen(port, hostname, function() {
	console.log('App running on *: ' + port);
});
