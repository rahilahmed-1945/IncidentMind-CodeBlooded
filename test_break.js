function test() {
  for (let i = 0; i < 5; i++) {
    console.log("i=", i);
    if (i === 2) {
      if (true) {
        console.log("breaking inside if");
        break;
      }
    }
  }
  console.log("loop done");
}
test();
