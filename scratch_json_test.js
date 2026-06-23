try {
  const result = JSON.parse("null");
  console.log("Parsed:", result, typeof result);
  if (result === null) console.log("result is exactly null");
} catch (e) {
  console.log("Threw error");
}
