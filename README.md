# whatsapp-api-node-js

<!-- REQUEST -->

# http://localhost:8000/send-message
    - METHOD POST
    - body -> form-data
        data : {
            number : <number_recipt>,
            message : <message_body>,
            sender : <token_id_device>
        }

# http://localhost:8000/status-online
    - METHOD POST
    - body -> form-data
        data : {
            sender : <token_id_device>
        }

# http://localhost:8000/number-registered
    - METHOD POST
    - body -> form-data
        data : {
            number : <number_recipt>,
            sender : <token_id_device>
        }
