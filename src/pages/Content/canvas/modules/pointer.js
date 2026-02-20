const getCanvasPointer = (canvas, fabricEvent) => {
  if (!canvas) {
    return { x: 0, y: 0 };
  }

  const nativeEvent = fabricEvent?.e || fabricEvent;

  if (typeof canvas.getScenePoint === "function") {
    return canvas.getScenePoint(nativeEvent);
  }

  if (typeof canvas.getPointer === "function") {
    return canvas.getPointer(nativeEvent);
  }

  return { x: 0, y: 0 };
};

export { getCanvasPointer };
