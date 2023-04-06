const phoneNumberFormatter = function(number) {
	// 1. Menghilangkan karakter selain angka
	let formatted = number.replace(/\D/g, '');

	// 2. Menghilangkan angka 0 di depan (prefix)
	//    Kemudian diganti dengan 62
	if (formatted.startsWith('0')) {
		formatted = '62' + formatted.substr(1);
	}

	if (!formatted.endsWith('@c.us')) {
		formatted += '@c.us';
	}

	return formatted;
}

const makeIdToken = function (length) {
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < length) {
	result += characters.charAt(Math.floor(Math.random() * charactersLength));
	counter += 1;
	}
	return result.toLowerCase();
}

const allowedFile = function (pFilename){
	const allowedExtention = ["png", "jpg", "jpeg", "txt", "xlsx", "xls", "pdf", "csv", "doc", "docx", "mp4", "mov"]
	let vFilename = pFilename.toLowerCase();
	return allowedExtention.includes(vFilename.slice(vFilename.indexOf('.') + 1));
}

const fileIsDocument = function(pFilename){
	const allowedExtention = ["txt", "xlsx", "xls", "pdf", "csv", "doc", "docx"]
	let vFilename = pFilename.toLowerCase();
	return allowedExtention.includes(vFilename.slice(vFilename.indexOf('.') + 1));
}

module.exports = {
	phoneNumberFormatter,makeIdToken, allowedFile, fileIsDocument
}