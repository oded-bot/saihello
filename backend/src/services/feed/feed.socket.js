function setupFeedSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join_video', (videoId) => {
      if (typeof videoId === 'string' && videoId.length < 64) {
        socket.join(`video:${videoId}`);
      }
    });

    socket.on('leave_video', (videoId) => {
      if (typeof videoId === 'string' && videoId.length < 64) {
        socket.leave(`video:${videoId}`);
      }
    });
  });
}

module.exports = { setupFeedSocket };
