const conDb = require('../config/mysql');

function getDataListDevice(callback){
    var dataLoadDevice = [];
	sqlQuery = `select
                    wad_token as id,
                    wad_device_id as description,
                    wad_webhook_url as 
                                    webhookUrl,
                    wad_ready as ready
                from
                    wa_list_device_tab`;
	conDb.query(sqlQuery,
		(err, result) => {

            if (err) {
                callback(err, null);
                return;
            }
            
			if (result.length > 0 ) {
				for (i = 0; i < result.length; i++) {
					if (result[i].ready == 1) {
						result[i].ready = true;
					} else {
						result[i].ready = false;
					}
				}
			}
            callback(null, result);
	});
}

function getDataDeviceByToken(pToken, callback){
	sqlQuery = `select
                    wad_token as id,
                    wad_device_id as description,
                    wad_webhook_url as 
                                    webhookUrl,
                    wad_ready as ready
                from
                    wa_list_device_tab
                where
                    wad_token = ?`;
	conDb.query(sqlQuery, [pToken],
		(err, result) => {

            if (err) {
                callback(err, null);
                return;
            }
            
			if (result.length > 0 ) {
				for (i = 0; i < result.length; i++) {
					if (result[i].ready == 1) {
						result[i].ready = true;
					} else {
						result[i].ready = false;
					}
				}
			}
            callback(null, result);
	});
}

function addNewDevice(pDescription, pToken, pWebhookUrl, callback){

    sqlQuery = 'INSERT INTO wa_list_device_tab (wad_device_id, wad_token, wad_webhook_url, wad_ready) values (?, ?, ?, ?) ON DUPLICATE KEY UPDATE wad_token = ?, wad_webhook_url = ?, wad_ready = ?';
	conDb.query(
		sqlQuery,
		[pDescription, pToken, pWebhookUrl, false, pToken, pWebhookUrl, false], (err, result) => {
		if (err){
			callback(err, null);
            return;
		}

        callback(null, result);
	});

}


module.exports = {
    getDataListDevice, getDataDeviceByToken, addNewDevice
}