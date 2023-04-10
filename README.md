# whatsapp-api-node-js

### How to use?
- Enter to the project directory
- Run `npm install`
- Run `npm run start:dev`
- Open browser and go to address `http://localhost:8000`


<!-- REQUEST -->

# http://localhost:8000/send-message
    - METHOD POST
    - body -> form-data
        data : {
            number : <number_recipt>,
            message : <message_body>,
            device : <token_id_device>
        }
        
# http://localhost:8000/send-msg-attachment
    - METHOD POST
    - body -> form-data
        data : {
            token : <token_id_device>,
            number : <number_recipt>,
            message : <message_body>,
            file : <file_upload>
        }

# http://localhost:8000/status-online
    - METHOD POST
    - body -> form-data
        data : {
            device : <token_id_device>
        }

# http://localhost:8000/number-registered
    - METHOD POST
    - body -> form-data
        data : {
            number : <number_recipt>,
            device : <token_id_device>
        }

# http://localhost:8000/add-device
    - METHOD POST
    - body -> form-data
        data : {
            description : <device_name>,
            webhookUrl : <webhook_url>
        }

# http://localhost:8000/logout
    - METHOD POST
    - body -> form-data
        data : {
            token : <device_id/token>
        }
