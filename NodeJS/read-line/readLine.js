var readline = require('readline');

var r = readline.createInterface({
  input:process.stdin,
  output:process.stdout
});

r.question("Do you like banana?", function(answer) {
  console.log("Hi Hong", answer);
  r.close() // 반드시 close()를 해줘야 합니다.
});
