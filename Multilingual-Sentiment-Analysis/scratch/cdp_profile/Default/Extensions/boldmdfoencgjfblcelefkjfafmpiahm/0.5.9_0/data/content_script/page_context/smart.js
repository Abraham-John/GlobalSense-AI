(function () {
  let sheetdone = false;
  let scheduled = false;
  let shadowdone = false;
  let adopteddone = false;
  const marker = "smart-dark-context";
  //
  const post = function (type) {
    try {
      window.postMessage({"from": marker, "type": type, "detail": {}}, "*");
    } catch (e) {}
  };
  //
  const notify = function (type) { // trailing throttle for hot paths (insertRule loops)
    if (scheduled) return;
    //
    scheduled = true;
    window.setTimeout(function () {
      scheduled = false;
      post(type);
    }, 80);
  };
  //
  if (shadowdone === false) {
    shadowdone = true;
    const original = Element.prototype.attachShadow;
    //
    Element.prototype.attachShadow = new Proxy(original, {
      "apply": function (target, self, args) {
        try {
          const base = self.getRootNode();
          const host = base instanceof ShadowRoot ? base.host : self;
          //
          if (host && host.nodeType === Node.ELEMENT_NODE) {
            if (host.getAttribute("smart-dark-shadow-host") === null) {
              host.setAttribute("smart-dark-shadow-host", '');
              post("shadow");
            }
          }
          //
          if (args) {
            if (args[0]) {
              if (args[0].mode) args[0].mode = "open";
            }
          }
        } catch (e) {}
        //
        return Reflect.apply(target, self, args);
      }
    });
  }
  //
  if (sheetdone === false) {
    sheetdone = true;
    const proto = window.CSSStyleSheet.prototype;
    const names = ["insertRule", "addRule", "deleteRule", "replaceSync", "replace"];
    //
    for (const name of names) {
      try {
        const original = proto[name];
        if (typeof original !== "function") continue;
        if (original["smart-dark-sheet"] === true) continue;
        //
        const wrapped = function () {
          const result = Reflect.apply(original, this, arguments);
          notify("sheet");
          return result;
        };
        //
        wrapped["smart-dark-sheet"] = true;
        proto[name] = wrapped;
      } catch (e) {}
    }
  }
  //
  if (adopteddone === false) {
    adopteddone = true;
    const targets = [window.Document, window.ShadowRoot];
    //
    for (const ctor of targets) {
      try {
        if (!ctor || !ctor.prototype) continue;
        const descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, "adoptedStyleSheets");
        //
        if (!descriptor) continue;
        if (descriptor.configurable !== true) continue;
        if (typeof descriptor.set !== "function" || typeof descriptor.get !== "function") continue;
        //
        Object.defineProperty(ctor.prototype, "adoptedStyleSheets", {
          "configurable": true,
          "enumerable": descriptor.enumerable === true,
          "get": function () {
            return descriptor.get.call(this);
          },
          "set": function (value) {
            const result = descriptor.set.call(this, value);
            notify("adopted");
            return result;
          }
        });
      } catch (e) {}
    }
  }
})();
