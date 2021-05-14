const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bodyParser = require('body-parser');
const tf =  require('@tensorflow/tfjs-node');
const mobilenet = require('@tensorflow-models/mobilenet');
const toUint8Array = require('base64-to-uint8array');

let model;

const app = express();

app.use(express.static(path.join(__dirname, 'static')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(multer({dest: '/tmp'}).any());

app.get('/', (req, res) => {
    res.sendFile('/index.html');
});


app.post('/predict', async (req, res) => {
  const imageData = fs.readFileSync(req.files[0].path)
    .toString('base64')
    .replace('data:image/jpeg;base64','')
    .replace('data:image/png;base64','')
  ;
  const imageArray = toUint8Array(imageData);
  const tensor3d = tf.node.decodeJpeg( imageArray, 3 );
  const prediction = await model.classify(tensor3d); 
  tensor3d.dispose();
  res.send(prediction[0].className);
});

app.get('*', (req, res) => {
  res.send('NOT FOUND')
})

app.listen(process.env.PORT || 8085, async () => {
  // const port = server.address().port;
  // console.log(`Loading imagenet model`);
  // model = await mobilenet.load({
  //   version: 2,
  //   alpha: 0.25 | .50 | .75 | 1.0,
  // });
  // console.log(`Imagenet model loaded`);
  // console.log(`Server listening on port ${port}!`)
})