async function blobToArrayBuffer(blob) {
  return await blob.arrayBuffer();
}

export default blobToArrayBuffer;
