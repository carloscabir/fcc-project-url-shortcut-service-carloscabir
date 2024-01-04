require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const dbConnection = require('./database/dbConnect.js')
const validateUrl = require('./schemas/shortUrl/url.js')
const bodyParser = require('body-parser')
const dns = require('dns');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

dbConnection()

const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true,
  },
  short_url: {
    type: Number,
    required: true,
  },
})

const UrlModel = mongoose.model('url', urlSchema)

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

const ERRORS_URLS_MESSAGES = {
  ERR_INVALID_URL: 'invalid url',
  ERR_DNS_NOT_FOUND: 'dns not found',
}

const SUCCESS_URLS_MESSAGES = {
  DNS_SUCCESSFULLY_FOUND: 'dns successfully found',
}

// To avoid ENOTFOUND error
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// When I post a url I...
app.post("/api/shorturl", async (req, res) => { 
  const { url } = req.body
  const validate = validateUrl({ url })

  if(!validate.success) return res.status(404).json({ error: ERRORS_URLS_MESSAGES.ERR_INVALID_URL })
  
  const REPLACE_REGEX = /^https?:\/\//i
  const urlWithoutProtocol = url.replace(REPLACE_REGEX, '')

  const urlResolver = async () => { 
      await sleep(1)
      const dnsResolved = dns.resolve(urlWithoutProtocol, async (error, address, family) => {
        if (error) {
          return {
            error: true,
            message: ERRORS_URLS_MESSAGES.ERR_DNS_NOT_FOUND,
            response: null,
          }
        } else { 
          console.log(`Ip of the address: ${address} and ip:config: ${family}`)
          return {
              error: null,
              message: SUCCESS_URLS_MESSAGES.DNS_SUCCESSFULLY_FOUND,
              response: {
                address,
                family
              }
          }
        }
      
      });

      return dnsResolved
    }

  
  
  try {
    const { callback } = await urlResolver()
    const dnsValid = await callback()

    if (dnsValid.error) return res.status(404).json({ error: ERRORS_URLS_MESSAGES.ERR_INVALID_URL })


    const collectionLength = await UrlModel.countDocuments()

    const newShortUrl = await UrlModel.create({ original_url: url, short_url: collectionLength + 1 })
    
    const { original_url, short_url } = newShortUrl

    return res.status(200).json({
      original_url,
      short_url
    })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

app.get("/api/shorturl/:url", async (req, res) => {
  const { url } = req.params
  try {
    const fullUrl = await UrlModel.findOne({ short_url: url })
    return res.redirect(fullUrl.original_url)
  } catch (err) {
      return res.json({ error: ERRORS_URLS_MESSAGES.ERR_INVALID_URL })
  }
 })

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
