onmessage = async (event) => {
  console.log(event.data);
  const opfsRoot = await navigator.storage.getDirectory();
  console.log(opfsRoot);
  const fileHandle = await opfsRoot.getFileHandle("test.db", { create: true });

  const writable = await fileHandle.createWritable();
  await writable.write("SELECT * FROM users;");
  await writable.close();
  console.log(fileHandle);
  postMessage("web worker");
};
