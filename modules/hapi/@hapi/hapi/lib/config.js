'use strict';

const Os = require('os');

const Joi = require('@hapi/joi');


const internals = {};


exports.symbol = Symbol('hapi-response');


exports.apply = function (type, options, ...message) {

    const result = internals[type].validate(options);

    if (result.error) {
        throw new Error(`Invalid ${type} options ${message.length ? '(' + message.join(' ') + ')' : ''} ${result.error.annotate()}`);
    }

    return result.value;
};


exports.enable = function (options) {

    const settings = options ? Object.assign({}, options) : {};         // Shallow cloned

    if (settings.security === true) {
        settings.security = {};
    }

    if (settings.cors === true) {
        settings.cors = {};
    }

    return settings;
};


internals.access = Joi.object({
    entity: Joi.valid('user', 'app', 'any'),
    scope: [false, Joi.array().items(Joi.string()).single().min(1)]
});


internals.auth = Joi.alternatives([
    Joi.string(),
    internals.access.keys({
        mode: Joi.valid('required', 'optional', 'try'),
        strategy: Joi.string(),
        strategies: Joi.array().items(Joi.string()).min(1),
        access: Joi.array().items(internals.access.min(1)).single().min(1),
        payload: [
            Joi.valid('required', 'optional'),
            Joi.boolean()
        ]
    })
        .without('strategy', 'strategies')
        .without('access', ['scope', 'entity'])
]);


internals.event = Joi.object({
    method: Joi.array().items(Joi.function()).single(),
    options: Joi.object({
        before: Joi.array().items(Joi.string()).single(),
        after: Joi.array().items(Joi.string()).single(),
        bind: Joi.any(),
        sandbox: Joi.valid('server', 'plugin'),
        timeout: Joi.number().integer().min(1)
    })
        .default({})
});


internals.exts = Joi.array()
    .items(internals.event.keys({ type: Joi.string().required() })).single();


internals.failAction = Joi.alternatives([
    Joi.valid('error', 'log', 'ignore'),
    Joi.function()
])
    .default('error');


internals.routeBase = Joi.object({
    app: Joi.object().allow(null),
    auth: internals.auth.allow(false),
    bind: Joi.object().allow(null),
    cache: Joi.object({
        expiresIn: Joi.number(),
        expiresAt: Joi.string(),
        privacy: Joi.valid('default', 'public', 'private'),
        statuses: Joi.array().items(Joi.number().integer().min(200)).min(1).single().default([200, 204]),
        otherwise: Joi.string().default('no-cache')
    })
        .allow(false)
        .default(),
    compression: Joi.object()
        .pattern(/.+/, Joi.object())
        .default(),
    cors: Joi.object({
        origin: Joi.array().min(1).allow('ignore').default(['*']),
        maxAge: Joi.number().default(86400),
        headers: Joi.array().items(Joi.string()).default(['Accept', 'Authorization', 'Content-Type', 'If-None-Match']),
        additionalHeaders: Joi.array().items(Joi.string()).default([]),
        exposedHeaders: Joi.array().items(Joi.string()).default(['WWW-Authenticate', 'Server-Authorization']),
        additionalExposedHeaders: Joi.array().items(Joi.string()).default([]),
        credentials: Joi.boolean().when('origin', { is: 'ignore', then: false }).default(false)
    })
        .allow(false, true)
        .default(false),
    ext: Joi.object({
        onPreAuth: Joi.array().items(internals.event).single(),
        onCredentials: Joi.array().items(internals.event).single(),
        onPostAuth: Joi.array().items(internals.event).single(),
        onPreHandler: Joi.array().items(internals.event).single(),
        onPostHandler: Joi.array().items(internals.event).single(),
        onPreResponse: Joi.array().items(internals.event).single(),
        onPostResponse: Joi.array().items(internals.event).single()
    })
        .default({}),
    files: Joi.object({
        relativeTo: Joi.string().pattern(/^([\/\.])|([A-Za-z]:\\)|(\\\\)/).default('.')
    })
        .default(),
    json: Joi.object({
        replacer: Joi.alternatives(Joi.function(), Joi.array()).allow(null).default(null),
        space: Joi.number().allow(null).default(null),
        suffix: Joi.string().allow(null).default(null),
        escape: Joi.boolean().default(false)
    })
        .default(),
    jsonp: Joi.string(),
    log: Joi.object({
        collect: Joi.boolean().default(false)
    })
        .default(),
    payload: Joi.object({
        output: Joi.valid('data', 'stream', 'file').default('data'),
        parse: Joi.boolean().allow('gunzip').default(true),
        multipart: Joi.object({
            output: Joi.valid('data', 'stream', 'file', 'annotated').required()
        })
            .default(false)
            .allow(true, false),
        allow: Joi.array().items(Joi.string()).single(),
        override: Joi.string(),
        protoAction: Joi.valid('error', 'remove', 'ignore').default('error'),
        maxBytes: Joi.number().integer().positive().default(1024 * 1024),
        uploads: Joi.string().default(Os.tmpdir()),
        failAction: internals.failAction,
        timeout: Joi.number().integer().positive().allow(false).default(10 * 1000),
        defaultContentType: Joi.string().default('application/json'),
        compression: Joi.object()
            .pattern(/.+/, Joi.object())
            .default()
    })
        .default(),
    plugins: Joi.object(),
    response: Joi.object({
        disconnectStatusCode: Joi.number().integer().min(400).default(499),
        emptyStatusCode: Joi.valid(200, 204).default(204),
        failAction: internals.failAction,
        modify: Joi.boolean(),
        options: Joi.object(),
        ranges: Joi.boolean().default(true),
        sample: Joi.number().min(0).max(100).when('modify', { then: Joi.forbidden() }),
        schema: Joi.alternatives(Joi.object(), Joi.array(), Joi.function()).allow(true, false),
        status: Joi.object().pattern(/\d\d\d/, Joi.alternatives(Joi.object(), Joi.array(), Joi.function()).allow(true, false))
    })
        .default(),
    security: Joi.object({
        hsts: Joi.alternatives([
            Joi.object({
                maxAge: Joi.number(),
                includeSubdomains: Joi.boolean(),
                includeSubDomains: Joi.boolean(),
                preload: Joi.boolean()
            }),
            Joi.boolean(),
            Joi.number()
        ])
            .default(15768000),
        xframe: Joi.alternatives([
            Joi.boolean(),
            Joi.valid('sameorigin', 'deny'),
            Joi.object({
                rule: Joi.valid('sameorigin', 'deny', 'allow-from'),
                source: Joi.string()
            })
        ])
            .default('deny'),
        xss: Joi.boolean().default(true),
        noOpen: Joi.boolean().default(true),
        noSniff: Joi.boolean().default(true),
        referrer: Joi.alternatives([
            Joi.boolean().valid(false),
            Joi.valid('', 'no-referrer', 'no-referrer-when-downgrade',
                'unsafe-url', 'same-origin', 'origin', 'strict-origin',
                'origin-when-cross-origin', 'strict-origin-when-cross-origin')
        ])
            .default(false)
    })
        .allow(null, false, true)
        .default(false),
    state: Joi.object({
        parse: Joi.boolean().default(true),
        failAction: internals.failAction
    })
        .default(),
    timeout: Joi.object({
        socket: Joi.number().integer().positive().allow(false),
        server: Joi.number().integer().positive().allow(false).default(false)
    })
        .default(),
    validate: Joi.object({
        headers: Joi.alternatives(Joi.object(), Joi.array(), Joi.function()).allow(null, true),
        params: Joi.alternatives(Joi.object(), Joi.array(), Joi.function()).allow(null, true),
        query: Joi.alternatives(Joi.object(), Joi.array(), Joi.function()).allow(null, false, true),
        payload: Joi.alternatives(Joi.object(), Joi.array(), Joi.function()).allow(null, false, true),
        state: Joi.alternatives(Joi.object(), Joi.array(), Joi.function()).allow(null, false, true),
        failAction: internals.failAction,
        errorFields: Joi.object(),
        options: Joi.object().default(),
        validator: Joi.object()
    })
        .default()
});


internals.server = Joi.object({
    address: Joi.string().hostname(),
    app: Joi.object().allow(null),
    autoListen: Joi.boolean(),
    cache: Joi.allow(null),                                 // Validated elsewhere
    compression: Joi.object({
        minBytes: Joi.number().min(1).integer().default(1024)
    })
        .allow(false)
        .default(),
    debug: Joi.object({
        request: Joi.array().items(Joi.string()).single().allow(false).default(['implementation']),
        log: Joi.array().items(Joi.string()).single().allow(false)
    })
        .allow(false)
        .default(),
    host: Joi.string().hostname().allow(null),
    info: Joi.object({
        remote: Joi.boolean().default(false)
    })
        .default({}),
    listener: Joi.any(),
    load: Joi.object({
        sampleInterval: Joi.number().integer().min(0).default(0)
    })
        .unknown()
        .default(),
    mime: Joi.object().allow(null).default(null),
    operations: Joi.object({
        cleanStop: Joi.boolean().default(true)
    })
        .default(),
    plugins: Joi.object(),
    port: Joi.alternatives([
        Joi.number().integer().min(0),          // TCP port
        Joi.string().pattern(/\//),               // Unix domain socket
        Joi.string().pattern(/^\\\\\.\\pipe\\/)   // Windows named pipe
    ])
        .allow(null),
    query: Joi.object({
        parser: Joi.function()
    })
        .default(),
    router: Joi.object({
        isCaseSensitive: Joi.boolean().default(true),
        stripTrailingSlash: Joi.boolean().default(false)
    })
        .default(),
    routes: internals.routeBase.default(),
    state: Joi.object(),                                    // Cookie defaults
    tls: Joi.alternatives([
        Joi.object().allow(null),
        Joi.boolean()
    ]),
    uri: Joi.string().pattern(/[^/]$/)
});


internals.vhost = Joi.alternatives([
    Joi.string().hostname(),
    Joi.array().items(Joi.string().hostname()).min(1)
]);


internals.handler = Joi.alternatives([
    Joi.function(),
    Joi.object().length(1)
]);


internals.route = Joi.object({
    method: Joi.string().pattern(/^[a-zA-Z0-9!#\$%&'\*\+\-\.^_`\|~]+$/).required(),
    path: Joi.string().required(),
    rules: Joi.object(),
    vhost: internals.vhost,

    // Validated in route construction

    handler: Joi.any(),
    options: Joi.any(),
    config: Joi.any()               // Backwards compatibility
})
    .without('config', 'options');


internals.pre = [
    Joi.function(),
    Joi.object({
        method: Joi.alternatives(Joi.string(), Joi.function()).required(),
        assign: Joi.string(),
        mode: Joi.valid('serial', 'parallel'),
        failAction: internals.failAction
    })
];


internals.routeConfig = internals.routeBase.keys({
    description: Joi.string(),
    id: Joi.string(),
    isInternal: Joi.boolean(),
    notes: [
        Joi.string(),
        Joi.array().items(Joi.string())
    ],
    pre: Joi.array().items(...internals.pre.concat(Joi.array().items(...internals.pre).min(1))),
    tags: [
        Joi.string(),
        Joi.array().items(Joi.string())
    ]
});


internals.cacheConfig = Joi.alternatives([
    Joi.function(),
    Joi.object({
        name: Joi.string().invalid('_default'),
        shared: Joi.boolean(),
        provider: [
            Joi.function(),
            {
                constructor: Joi.function().required(),
                options: Joi.object({
                    partition: Joi.string().default('hapi-cache')
                })
                    .unknown()      // Catbox client validates other keys
                    .default({})
            }
        ],
        engine: Joi.object()
    })
        .xor('provider', 'engine')
]);


internals.cache = Joi.array().items(internals.cacheConfig).min(1).single();


internals.cachePolicy = Joi.object({
    cache: Joi.string().allow(null).allow(''),
    segment: Joi.string(),
    shared: Joi.boolean()
})
    .unknown();                     // Catbox policy validates other keys


internals.method = Joi.object({
    bind: Joi.object().allow(null),
    generateKey: Joi.function(),
    cache: internals.cachePolicy
});


internals.methodObject = Joi.object({
    name: Joi.string().required(),
    method: Joi.function().required(),
    options: Joi.object()
});


internals.register = Joi.object({
    once: true,
    routes: Joi.object({
        prefix: Joi.string().pattern(/^\/.+/),
        vhost: internals.vhost
    })
        .default({})
});


internals.semver = Joi.string();


internals.plugin = internals.register.keys({
    options: Joi.any(),
    plugin: Joi.object({
        register: Joi.function().required(),
        name: Joi.string().when('pkg.name', { is: Joi.exist(), otherwise: Joi.required() }),
        version: Joi.string(),
        multiple: Joi.boolean().default(false),
        dependencies: [
            Joi.array().items(Joi.string()).single(),
            Joi.object().pattern(/.+/, internals.semver)
        ],
        once: true,
        requirements: Joi.object({
            hapi: Joi.string(),
            node: Joi.string()
        })
            .default(),
        pkg: Joi.object({
            name: Joi.string(),
            version: Joi.string().default('0.0.0')
        })
            .unknown()
            .default({})
    })
        .unknown()
})
    .without('once', 'options')
    .unknown();


internals.rules = Joi.object({
    validate: Joi.object({
        schema: Joi.alternatives(Joi.object(), Joi.array()).required(),
        options: Joi.object()
            .default({ allowUnknown: true })
    })
});