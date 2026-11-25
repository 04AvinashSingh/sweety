const { IncomingMessage, ServerResponse } = require("node:http");
const { Socket } = require("node:net");

// Exercise Express and its middleware with Node HTTP streams when the host
// prohibits listening sockets. The default test transport remains Supertest.
module.exports = function inProcessRequest(app) {
  const methods = {};
  for (const method of ["get", "post", "put", "delete"]) {
    methods[method] = (path) => {
      const headers = {};
      let body;
      let pending;
      const execute = () => {
        if (pending) return pending;
        pending = new Promise((resolve, reject) => {
          const req = new IncomingMessage(new Socket());
          req.method = method.toUpperCase();
          req.url = path;
          req.headers = { host: "localhost", ...headers };
          let payload;
          if (body !== undefined) {
            payload = JSON.stringify(body);
            req.headers["content-type"] = "application/json";
            req.headers["content-length"] = String(Buffer.byteLength(payload));
          }
          const res = new ServerResponse(req);
          const chunks = [];
          const timeout = setTimeout(
            () => reject(new Error("Request timed out")),
            5000,
          );
          res.write = (chunk) => {
            chunks.push(Buffer.from(chunk));
            return true;
          };
          res.end = (chunk) => {
            if (chunk) chunks.push(Buffer.from(chunk));
            clearTimeout(timeout);
            req.destroy();
            req.socket.destroy();
            res.emit("finish");
            const text = Buffer.concat(chunks).toString();
            try {
              resolve({
                status: res.statusCode,
                body: text ? JSON.parse(text) : {},
                headers: res.getHeaders(),
              });
            } catch (error) {
              reject(error);
            }
            return res;
          };
          req.on("error", reject);
          app.handle(req, res);
          if (payload !== undefined) req.push(payload);
          req.push(null);
        });
        return pending;
      };
      return {
        set(name, value) {
          headers[name.toLowerCase()] = value;
          return this;
        },
        send(value) {
          body = value;
          return execute();
        },
        then(resolve, reject) {
          return execute().then(resolve, reject);
        },
      };
    };
  }
  return methods;
};
