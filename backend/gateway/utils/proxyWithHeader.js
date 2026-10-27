import proxy from "express-http-proxy"

export const proxyWithHeader = (serviceUrl) => {
    return proxy(serviceUrl, {
        proxyReqOptDecorator: (opts, srcReq) => {
            if (srcReq.user) {
                opts.headers["x-user-id"] = srcReq.user.userId;
            }
            return opts;
        }
    })
}