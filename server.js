const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bodyParser = require('body-parser');
const tf =  require('@tensorflow/tfjs-node');
const toUint8Array = require('base64-to-uint8array');
const mymodel="file://mymodel/model.json"
const classesDir = [];
let model;

const app = express();

app.use(express.static(path.join(__dirname, 'static')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(multer({dest: '/tmp'}).any());

app.get('/', (req, res) => {
    res.sendFile('/index.html');
});



// convert image to Tensor
const processInput = function (imagin) 
{
	console.log('Converting image to tensor ' ); 
  const imageData = fs.readFileSync(imagin)
  .toString('base64')
  .replace('data:image/jpeg;base64','')
  .replace('data:image/png;base64','')
;
const uint8array = toUint8Array(imageData);

	return tf.node.decodeImage(uint8array, 3).expandDims();
}


app.post('/predict', async (req, res) => {
  try{
    const inputTensor = processInput(req.files[0].path);
		console.log('Processed image ' );
		ofstHeight = inputTensor.shape[1];
		ofstWidth = inputTensor.shape[2];	

  const smallImg = tf.image.resizeBilinear(inputTensor, [ofstHeight, ofstWidth]);
  const resized = tf.cast(smallImg, 'int32');
  var tf4d_ = tf.tensor4d(Array.from(resized.dataSync()), [1,ofstHeight, ofstWidth, 3]);
  const tf4d = tf.cast(tf4d_, 'int32'); 
  const prediction = await model.executeAsync(tf4d); 
  //get result from prediction
  const data=getCount(prediction);

 if (data) {
      res.send(data);
    } else {
      res.send("No fruit detected");
    }
  }
  catch(err){
    console.error(err);
  }
});

app.get('*', (req, res) => {
  res.send('NOT FOUND')

})

app.listen(process.env.PORT || 8085, async () => {
try {
  console.log(`Loading model`);
  
  model=await tf.loadGraphModel(mymodel);

  // model = await fruitmodel.load({
  //   version: 2,
  //   alpha: 0.25 | .50 | .75 | 1.0,
  // });
  //  model = await cocossd.load({
  // base:'mobilenet_v2'
  // });
  console.log(`model loaded`);
  console.log(`Server listening on port ${process.env.PORT || 8085}!`)
}
catch(err){
  console.error(err);
}
});



// load labels into an array
var labelstoArray = fs.readFileSync('mymodel/dict.txt').toString().split("\n");
for(i in labelstoArray) 
{
    //console.log(labelstoArray[i],i);
	classesDir.push({name: labelstoArray[i],id: i})
}

// process the model output into a friendly JSON format
const processOutput = function (predictions) 
{
	console.log('processOutput');
	const threshold = 0.85;
	// 4 classes, 5 score, 6 boxes
	//Boxes from prediction array
    const boxes = predictions[4].arraySync();
  
    //Scores from prediction array
    const scores = predictions[2].arraySync();
    //Classes from prediction array
    const classes = predictions[1].dataSync();
	 // console.log(predictions[1].arraySync());
	
	 //Set Predicted Item = 0
    var totalpredicted = 0;
    //Declare Prediction Result
    const predictionsresult = [];
    //For each score, above treshold
    scores[0].forEach((score, i) => 
	{
		if (score > threshold) 
		{
			//To keep track of total item count
			totalpredicted++;
			//Coordinates
			const bbox = [];
			const minY = boxes[0][i][0] * ofstHeight;
			const minX = boxes[0][i][1] * ofstWidth;
			const maxY = boxes[0][i][2] * ofstHeight;
			const maxX = boxes[0][i][3] * ofstWidth;
			bbox[0] = minX;
			bbox[1] = minY;
			bbox[2] = maxX - minX;
			bbox[3] = maxY - minY;
			//Push To Predictions Result
			predictionsresult.push({
			class: classes[i],
			label: classesDir[classes[i]].name,
			score: score.toFixed(4),
			bbox: bbox
			})
	
		}
	})
	
	return predictionsresult;
	
}

//get count of items if all are same.
const getCount = function (predictions) 
{
  try{
    const jsonOutput = processOutput(predictions);
    var temp = [];
    var produce = [];
    
    for(var i=0;i<jsonOutput.length;i++){
      if(temp.indexOf(jsonOutput[i].label) == -1){
          temp.push(jsonOutput[i].label);
         var _data = {};
         _data.name = jsonOutput[i].label;
         _data.count = 1;
         produce.push(_data);
      }else{
        for(var j=0;j<produce.length;j++){
          if(produce[j].name === jsonOutput[i].label){
             var _x = parseInt(produce[j].count) + 1;
             produce[j].count = _x;     
         }
         else{
        return  msg="Different items found! Please place similar items."   
        }
      }
      }
    }
    //return result=produce[0].name +":"+produce[0].count;

     return result=produce;
  }
  catch(err){
    console.error(err);
  }
};
