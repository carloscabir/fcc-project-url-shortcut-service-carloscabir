const mongoose = require('mongoose');

const dbConnection = () => {
  mongoose.connect(process.env.MONGO_URI)
  .then(res => {
    console.log(`Connected to ${res.connection.name} database`)
    return res.connection
  })
  .catch(err => {
    console.log(err)
    return err
  })
}

module.exports = dbConnection