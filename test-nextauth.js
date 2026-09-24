const NextAuth = require("next-auth").default || require("next-auth");
console.log(Object.keys(NextAuth({ providers: [] })));
