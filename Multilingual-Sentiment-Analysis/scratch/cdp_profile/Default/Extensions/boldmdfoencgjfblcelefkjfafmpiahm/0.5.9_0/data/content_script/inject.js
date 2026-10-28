var background = (function () {
  let tmp = {};
  /*  */
  chrome.runtime.onMessage.addListener(function (request) {
    for (let id in tmp) {
      if (tmp[id] && (typeof tmp[id] === "function")) {
        if (request.path === "background-to-page") {
          if (request.method === id) {
            tmp[id](request.data);
          }
        }
      }
    }
  });
  /*  */
  return {
    "receive": function (id, callback) {
      tmp[id] = callback;
    },
    "send": function (id, data) {
      chrome.runtime.sendMessage({
        "method": id, 
        "data": data,
        "path": "page-to-background"
      }, function () {
        return chrome.runtime.lastError;
      });
    }
  }
})();

var config = {
  "log": false,
  "current": {},
  "addon": {
    "state": null
  },
  "general": {
    "link": document.getElementById("dark-mode-general-link")
  },
  "custom": {
    "link": document.getElementById("dark-mode-custom-link"),
    "style": document.getElementById("dark-mode-custom-style")
  },
  "start": function () {
    chrome.storage.local.get(null, config.render.pre);
    config.observer.storage();
  },
  "message": function (e) {
    if (config.smart.selected) smart.message(e);
    if (config.native.selected) native.message(e);
  },
  "content": function (e) {
    if (config.smart.selected) smart.content(e);
    if (config.native.selected) native.content(e);
  },
  "load": function () {
    config.observer.head.disconnect();
    /*  */
    if (config.smart.selected) smart.load();
    if (config.native.selected) native.load();
    /*  */
    if (config.temporarily.is.removed === false) {
      const delay = config.page.metrics.temporarily.delay !== undefined ? Number(config.page.metrics.temporarily.delay) : 200;
      //
      config.temporarily.is.removed = true;
      config.temporarily.remove(delay, 5);
    }
    /*  */
    window.removeEventListener("load", config.load, false);
  },
  "observer": {
    "storage": function () {
      chrome.storage.onChanged.addListener(function (e) {
        const keys = Object.keys(e).filter(function (k) {return k.indexOf("section-") !== 0});
        if (keys.length) background.send("reload");
      });
    },
    "head": new MutationObserver(function () {
      let parent = config.page.metrics.documentroot ? document.documentElement : document.head;
      if (parent) {
        config.check.darkmode.nodes(0);
        config.observer.head.disconnect();
      }
    })
  },
  "hostname": function (url) {
    try {
      url = url.replace("www.", '');
      let s = url.indexOf("//") + 2;
      if (s > 1) {
        let o = url.indexOf('/', s);
        if (o > 0) return url.substring(s, o);
        else {
          o = url.indexOf('?', s);
          if (o > 0) return url.substring(s, o);
          else return url.substring(s);
        }
      } else {
        return url;
      }
    } catch (e) {
      return url;
    }
  },
  "temporarily": {
    "timeout": undefined,
    "is": {
      "slow": false,
      "removed": false,
    },
    "id": {
      "start": "temporarily-dark-start",
      "display": "temporarily-dark-display",
      "simpledark": "temporarily-dark-simple",
      "brightness": "temporarily-dark-brightness"
    },
    "add": function (attribute) {
      if (document.documentElement) {
        document.documentElement.setAttribute(attribute, '');
      }
    },
    "remove": function (delay, loc) {
      if (document.documentElement) {
        if (config.log) {
          console.error(loc);
        }
        //
        if (delay) {
          if (config.temporarily.timeout) window.clearTimeout(config.temporarily.timeout);
          config.temporarily.timeout = window.setTimeout(function () {
            document.documentElement.removeAttribute(config.temporarily.id.start);
            document.documentElement.removeAttribute(config.temporarily.id.display);
            document.documentElement.removeAttribute(config.temporarily.id.simpledark);
            document.documentElement.removeAttribute(config.temporarily.id.brightness);
          }, delay);
        } else {
          document.documentElement.removeAttribute(config.temporarily.id.start);
          document.documentElement.removeAttribute(config.temporarily.id.display);
          document.documentElement.removeAttribute(config.temporarily.id.simpledark);
          document.documentElement.removeAttribute(config.temporarily.id.brightness);
        }
      }
    }
  },
  "convert": {
    "color": {
      "to": {
        "rgba": function (value) {
          try {
            if (!value) return null;
            if (/^rgba?\(\s*\d+/.test(value)) return value;
            /*  */
            const tmp = document.createElement("div");
            tmp.style.color = value;
            tmp.style.display = "none";
            document.body.appendChild(tmp);
            /*  */
            const computed = window.getComputedStyle(tmp).color;
            tmp.remove();
            /*  */
            if (/^rgba?\(\s*\d+/.test(computed)) {
              return computed;
            } else {
              const canvas = document.createElement("canvas");
              canvas.width = 1;
              canvas.height = 1;
              const ctx = canvas.getContext("2d");
              /*  */
              ctx.fillStyle = computed;
              ctx.fillRect(0, 0, 1, 1);
              /*  */
              const imagedata = ctx.getImageData(0, 0, 1, 1).data;
              return imagedata && imagedata.length ? `rgba(${imagedata[0]}, ${imagedata[1]}, ${imagedata[2]}, ${imagedata[3] / 255})` : null;
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            //
            return null;
          }
          //
          return null;
        }
      }
    }
  },
  "colortemperature": {
    "hostname": '',
    "whitelist": [],
    "remove": function () {
      const overlay = document.querySelector(".colortemperature-overlay");
      /*  */
      document.documentElement.removeAttribute("color-temperature");
      if (overlay) overlay.remove();
    },
    "render": function (e) {
      const red = e.storage["colortemperature-red"];
      const blue = e.storage["colortemperature-blue"];
      const green = e.storage["colortemperature-green"];
      const opacity = e.storage["colortemperature-opacity"];
      /*  */
      if (window === window.top) {
        const overlay = document.querySelector(".colortemperature-overlay");
        /*  */
        if ("top" in e) config.colortemperature.hostname = (new URL(e.top).hostname).replace("www.", '');
        if ("colortemperature-whitelist" in e.storage) config.colortemperature.whitelist = e.storage["colortemperature-whitelist"];
        /*  */
        if (overlay) overlay.remove();
        document.documentElement.removeAttribute("color-temperature");
        document.documentElement.style.removeProperty("--colortemperature-red");
        document.documentElement.style.removeProperty("--colortemperature-blue");
        document.documentElement.style.removeProperty("--colortemperature-green");
        document.documentElement.style.removeProperty("--colortemperature-opacity");
        /*  */
        const action = config.colortemperature.hostname ? config.colortemperature.whitelist.indexOf(config.colortemperature.hostname) === -1 : true;
        if (action) {
          const overlay = document.createElement("div");
          overlay.setAttribute("class", "colortemperature-overlay");
          /*  */
          document.documentElement.setAttribute("color-temperature", '');
          document.documentElement.style.setProperty("--colortemperature-red", red);
          document.documentElement.style.setProperty("--colortemperature-blue", blue);
          document.documentElement.style.setProperty("--colortemperature-green", green);
          document.documentElement.style.setProperty("--colortemperature-opacity", opacity / 100);
          document.documentElement.insertBefore(overlay, document.documentElement.firstChild);
        }
      }
    }
  },
  "check": {
    "darkness": function (e) {
      if (e) config.page.metrics.darknessstorage = e;
      /*  */
      const cookies = config.page.metrics.darknessstorage.cookie;
      const excludeclassnames = config.page.metrics.darknessstorage.excludeclassnames;
      const excludeattributes = config.page.metrics.darknessstorage.excludeattributes;
      const excludemetacolorscheme = config.page.metrics.darknessstorage.excludemetacolorscheme;
      const iscolorschemedark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const action = config.page.metrics.exclude.incolorschemedark ? iscolorschemedark : true;
      /*  */
      if (action) {
        try {
          const body = document.body || null;
          const html = document.documentElement;
          const escaped = excludeclassnames.map(str => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
          const meta = document.querySelector && document.querySelector('meta[name="color-scheme"]');
          const pattern = escaped && escaped.length ? "(?<![a-z0-9-])(" + escaped.join('|') + ")(?![a-z0-9-])" : null;
          const darkclassnames = pattern ? new RegExp(pattern, 'i') : null;
          //
          if (excludemetacolorscheme) {
            if (meta && /dark/i.test(meta.getAttribute("content") || '')) {            
              return true;
            }
          }
          //
          if (darkclassnames) {
            if (darkclassnames.test(html.className || '') || (body && darkclassnames.test(body.className || ''))) {
              return true;
            }
          }
          //
          for (const name of excludeattributes) {
            const attribute = (html.getAttribute && html.getAttribute(name)) || (body && body.getAttribute && body.getAttribute(name));
            if (attribute) {
              if (attribute !== "light dark" && attribute !== "dark light") {
                if (darkclassnames.test(attribute)) {
                  return true;
                }
              }
            }
          }
        } catch (e) {
          if (config.log) {
            console.error(e);
          }
        }
        /*  */
        try {
          if (cookies && cookies.length) {
            for (let i = 0; i < cookies.length; i++) {
              if (document.cookie) {
                if (document.cookie.indexOf(cookies[i]) !== -1) {
                  return true;
                }
              }
              /*  */
              if (localStorage) {
                for (let j = 0; j < localStorage.length; j++) {
                  const key = localStorage.key(j);
                  if (key.indexOf(cookies[i]) !== -1) {
                    return true;
                  }
                }
              }
              /*  */
              if (sessionStorage) {
                for (let j = 0; j < sessionStorage.length; j++) {
                  const key = sessionStorage.key(j);
                  if (key.indexOf(cookies[i]) !== -1) {
                    return true;
                  }
                }
              }
            }
          }
        } catch (e) {
          if (config.log) {
            console.error(e);
          }
        }
      }
      /*  */
      return false;
    },
    "darkmode": {
      "nodes": function (loc) {
        let tmp = {};
        let parent = config.page.metrics.documentroot ? document.documentElement : document.head;
        /*  */
        if (parent) {
          tmp.a = document.getElementById("dark-mode-general-link");
          if (!tmp.a) {
            parent.appendChild(config.general.link);
          }
          /*  */
          tmp.b = document.getElementById("dark-mode-custom-link");
          if (!tmp.b) {
            parent.appendChild(config.custom.link);
          }
          /*  */
          tmp.c = document.getElementById("dark-mode-custom-style");
          if (!tmp.c) {
            parent.appendChild(config.custom.style);
          }
          /*  */
          tmp.d = document.getElementById("dark-mode-native-style");
          if (!tmp.d) {
            parent.appendChild(config.native.style);        
          }
          /*  */
          tmp.d = document.getElementById("dark-mode-native-sheet");
          if (!tmp.d) {
            parent.appendChild(config.native.sheet);
            //
            if (config.native.stylesheet === null) {
              config.native.stylesheet = config.native.sheet.sheet;
              background.send("load");
            }
          }
        }
      },
      "native": {
        "styles": function (loc) {
          if (config.native.style) {
            if (!config.native.style.parentNode) { // style is removed!
              document.documentElement.appendChild(config.native.style);
              //
              if (config.log) {
                console.error("re-attaching the native style to the root!", loc);
              }
            }
          }
          //
          if (config.native.sheet) {
            if (!config.native.sheet.parentNode) { // sheet is removed!
              if (config.native.stylesheet) {
                if (!config.native.stylesheet.ownerNode) {
                  if (config.native.stylesheet.cssRules) {
                    if (config.native.stylesheet.cssRules.length) {
                      let rulesText = '';
                      for (let i = 0; i < config.native.stylesheet.cssRules.length; i++) {
                        rulesText += config.native.stylesheet.cssRules[i].cssText + '\n';
                      }
                      //
                      if (rulesText) {
                        config.native.sheet.textContent = rulesText;
                        document.documentElement.appendChild(config.native.sheet);
                        //
                        if (config.native.sheet.sheet) {
                          config.native.stylesheet = config.native.sheet.sheet;
                        } else {
                          window.requestAnimationFrame(function () {
                            config.native.stylesheet = config.native.sheet.sheet;
                          });
                        }
                        //
                        if (config.log) {
                          console.error("re-attaching the native sheet to the root!", loc);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "darkcolor": {
      "rgba": function (e, t) {
        if (!e) {
          return {
            "target": e,
            "result": false,
          };
        }
        /*  */
        const cond_1 = e === "transparent";
        const cond_2 = e === "rgba(0, 0, 0, 0)";
        /*  */
        if (cond_1 || cond_2) {
          return {
            "target": e,
            "result": false
          };
        }
        /*  */
        const values = e.match(/\d+/g);
        if (!values || values.length < 3) {
          return {
            "result": false, 
            "target": values
          };
        }
        /*  */
        const [r, g, b] = values.map(Number);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        /*  */
        return {
          "target": e,
          "result": brightness < Number(t)
        };
      },
      "page": function (loc) {
        const iscolorschemedark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const action = config.page.metrics.exclude.incolorschemedark ? iscolorschemedark : true;
        /*  */
        if (action) {
          if (config.page.metrics.exclude.csscolorscheme || config.page.metrics.exclude.darkbackground) {
            try {
              const sheets = document.styleSheets;
              const rules = {"style": [], "media": []};
              const threshold = config.page.metrics.exclude.darkbackgroundthreshold;
              /*  */
              rules.check = function (rule, scheme) {
                const text = rule.selectorText;
                if (text) {
                  if (text.includes("html") || text.includes("body") || text.includes(":root")) {
                    const conds = {};
                    const selectors = text.split(',');
                    /*  */
                    conds.scheme = scheme;
                    conds.html = selectors.some(e => e.trim() === "html");
                    conds.body = selectors.some(e => e.trim() === "body");
                    conds.root = selectors.some(e => e.trim() === ":root");
                    /*  */
                    if (config.page.metrics.exclude.csscolorscheme) {
                      if ((conds.html || conds.root) && conds.scheme) {
                        const value = rule.style.getPropertyValue("color-scheme").trim();
                        if (value === "dark") {
                          return true;
                        }
                      }
                    }
                    /*  */
                    if (config.page.metrics.exclude.darkbackground) {
                      const exclude = config.page.metrics.exclude.darkbackgroundnative ? (native.dark.engine.is.active || smart.dark.engine.is.active) : true;
                      if (exclude) {
                        if (conds.html || conds.body) {
                          const color = config.convert.color.to.rgba(rule.style.backgroundColor || rule.style.getPropertyValue("background-color"));
                          if (color) {
                            const flag = config.check.darkcolor.rgba(color, threshold);
                            if (flag) {
                              return flag.result;
                            }
                          }
                        }
                      }
                    }
                  }
                }
                /*  */
                return false;
              }
              /*  */
              if (sheets) {
                for (const sheet of sheets) {
                  if (sheet.ownerNode) {
                    const conds = [];
                    const id = sheet.ownerNode.id;
                    const name = sheet.ownerNode.className;
                    /*  */
                    conds[0] = id !== "dark-mode-custom-link";
                    conds[1] = id !== "dark-mode-general-link";
                    conds[2] = id !== "dark-mode-custom-style";
                    conds[3] = id !== "dark-mode-native-style";
                    conds[4] = id !== "dark-mode-native-sheet";
                    conds[5] = name !== native.dark.class.original;
                    conds[6] = name !== native.dark.class.processed;
                    /*  */
                    if (conds.every(Boolean)) {
                      try {
                        rules.style = sheet.cssRules;
                      } catch (e) {}
                      /*  */
                      for (const rule of rules.style) {
                        if (rule) {
                          if (rule.selectorText) {
                            if (rules.check(rule, false)) {
                              return true;
                            }
                          }
                          /*  */
                          if (rule.conditionText) {
                            const condition = rule.conditionText.trim();
                            if (iscolorschemedark && condition === "(prefers-color-scheme: dark)") {
                              try {
                                rules.media = rule.cssRules;
                              } catch (e) {}
                              /*  */
                              for (const rule of rules.media) {
                                if (rule) {
                                  if (rules.check(rule, true)) {
                                    return true;
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            } catch (e) {
              return false;
            }
          }
        }
        /*  */
        return false;
      }
    }
  },
  "style": {
    "remove": function (loc) {
      try {
        config.style.clear(null, 0);
        //
        document.documentElement.removeAttribute("color-temperature");
        document.documentElement.removeAttribute(config.temporarily.id.start);
        document.documentElement.removeAttribute(config.temporarily.id.display);
        document.documentElement.removeAttribute(config.temporarily.id.simpledark);
        document.documentElement.removeAttribute(config.temporarily.id.brightness);
        //
        config.custom.link.remove();
        config.native.sheet.remove();
        config.custom.style.remove();
        config.native.style.remove();
        config.general.link.remove();
        //
        smart.dark.engine.stop();
        native.dark.engine.stop();
        //
        config.native.sheet.disabled = true;
      } catch (e) {
        if (config.log) {
          console.error(e);
        }
      }
    },
    "clear": function (e, loc) {
      try {
        if (e) {
          if ("reload" in e) config.current.reload = e.reload;
          if ("frameId" in e) config.current.frameId = e.frameId;
        }
        /*  */
        if (config.current.frameId === 0) {
          if (config.current.reload === false) {
            config.temporarily.remove(0, loc);
          }
        }
        //
        document.documentElement.removeAttribute(config.temporarily.id.start);
        //
        smart.dark.engine.stop();
        native.dark.engine.stop();
        //
        config.native.sheet.disabled = true;
        config.custom.style.textContent = '';
        config.native.style.textContent = '';
        config.custom.link.removeAttribute("href");
        config.general.link.removeAttribute("href");
      } catch (e) {
        if (config.log) {
          console.error(e);
        }
      }
    },
    "apply": function (e) {
      document.documentElement.removeAttribute(config.temporarily.id.start);
      /*  */
      const apply = config.custom.style && config.native.style;
      /*  */
      try {
        if (apply) {
          const loc = e.loc;
          const href_g = e.href_g;
          const href_c = e.href_c;
          const text_c = e.text_c;
          const text_n = e.text_n;
          const text_s = e.text_s;
          const options = e.options;
          /*  */
          if (options.frameId === 0) {
            if (options.reload === false) {
              if (href_g === '' && href_c === '' && text_c === '' && text_n === '' && text_s === '') {
                config.temporarily.remove(0, 1);
              } else {
                const action = options.temporarilyaction;
                const delay = options.temporarilydelay !== undefined ? Number(options.temporarilydelay) : 200;
                const attribute = options.temporarilybrightness ? config.temporarily.id.brightness : (options.temporarilydisplay ? config.temporarily.id.display : config.temporarily.id.simpledark);
                /*  */
                if (action) {
                  if (!options.recheck) {
                    config.temporarily.add(attribute);
                  }
                }
                /*  */
                if (text_n === '' && text_s === '') {
                  config.temporarily.remove(delay, 2);
                }
              }
            } else {
              config.temporarily.remove(0, 3);
            }
          } else {
            config.temporarily.remove(0, 4);
          }
          /*  */
          config.check.darkmode.nodes(1);
          config.custom.style.textContent = text_c;
          config.native.style.textContent = text_n;
          /*  */
          href_c ? config.custom.link.setAttribute("href", href_c) : config.custom.link.removeAttribute("href");
          href_g ? config.general.link.setAttribute("href", href_g) : config.general.link.removeAttribute("href");
          /*  */
          if (text_n) {
            native.dark.engine.render(options);
          } else if (text_s) {
            smart.dark.engine.render(options);
          } else {
            if (native.dark.engine.is.active || smart.dark.engine.is.active) {
              config.style.clear(options, 9);
            }
          }
        }
      } catch (e) {
        if (config.log) {
          console.error(e);
        }
      }
    }
  },
  "render": {
    "pre": function (e) {
      config.addon.state = e.state;
      /*  */
      const action = e.temporarilyaction;
      const parent = e.documentroot ? document.documentElement : document.head;
      /*  */
      if (config.addon.state === "dark") {
        if (action === true) {
          document.documentElement.setAttribute(config.temporarily.id.start, '');
        }
      }
      /*  */
      if (!config.general.link) {
        config.general.link = document.createElement("link");
        config.general.link.setAttribute("type", "text/css");
        config.general.link.setAttribute("rel", "stylesheet");
        config.general.link.setAttribute("id", "dark-mode-general-link");
      }
      /*  */
      if (!config.custom.link) {
        config.custom.link = document.createElement("link");
        config.custom.link.setAttribute("type", "text/css");
        config.custom.link.setAttribute("rel", "stylesheet");
        config.custom.link.setAttribute("id", "dark-mode-custom-link");
      }
      /*  */
      if (!config.custom.style) {
        config.custom.style = document.createElement("style");
        config.custom.style.setAttribute("lang", "en");
        config.custom.style.setAttribute("type", "text/css");
        config.custom.style.setAttribute("id", "dark-mode-custom-style");
      }
      /*  */
      if (!config.native.style) {
        config.native.style = document.createElement("style");
        config.native.style.setAttribute("lang", "en");
        config.native.style.setAttribute("type", "text/css");
        config.native.style.setAttribute("id", "dark-mode-native-style");
      }    
      /*  */
      if (!config.native.sheet) {
        config.native.sheet = document.createElement("style");
        config.native.sheet.setAttribute("lang", "en");
        config.native.sheet.setAttribute("type", "text/css");
        config.native.sheet.setAttribute("id", "dark-mode-native-sheet");
      }
      /*  */
      if (parent) {
        parent.appendChild(config.custom.link);
        parent.appendChild(config.general.link);
        parent.appendChild(config.custom.style);
        parent.appendChild(config.native.style);
        parent.appendChild(config.native.sheet);
        //
        config.native.stylesheet = config.native.sheet.sheet;
        background.send("load");
      } else {
        config.observer.head.observe(document, {
          "subtree": true,
          "childList": true,
        });
      }
    },
    "post": function (e) {
      try {
        config.addon.state = e.storage.state;
        /*  */
        if (config.addon.state === "dark") {
          config.colortemperature.remove();
          const page = e.top ? e.top : document.location.href;
          /*  */
          if (page.indexOf("/chrome/newtab") !== -1) {
            return config.style.clear(e, 1);
          }
          /*  */
          website.theme.number.active = null;
          for (let i = 1; i <= website.total.themes.number; i++) {
            if (e.storage["dark_" + i]) {
              website.theme.number.active = i;
              break;
            }
          }
          /*  */
          config.smart.selected = website.theme.number.active === website.theme.number.smart;
          config.native.selected = website.theme.number.active === website.theme.number.native;
          /*  */
          config.page.metrics.ignore = e.storage.nativeignore && (config.native.selected || config.smart.selected);
          config.page.metrics.respect = e.storage.nativerespect && (config.native.selected || config.smart.selected);
          config.page.metrics.compatible = e.storage.nativecompatible && (config.native.selected || config.smart.selected);
          /*  */
          config.native.metrics.css.rules = e.storage.nativecssrules;
          config.native.metrics.css.variables = e.storage.nativecssvariables;
          /*  */
          config.native.metrics.remove.background.image = e.storage.nativeremoveimage;
          config.native.metrics.remove.background.color = e.storage.nativeremovecolor;
          /*  */
          config.page.metrics.temporarily.delay = e.storage.temporarilydelay;
          config.page.metrics.temporarily.action = e.storage.temporarilyaction;
          config.page.metrics.temporarily.display = e.storage.temporarilydisplay;
          config.page.metrics.temporarily.threshold = e.storage.temporarilythreshold;
          config.page.metrics.temporarily.simpledark = e.storage.temporarilysimpledark;
          config.page.metrics.temporarily.brightness = e.storage.temporarilybrightness;
          /*  */
          config.native.metrics.range.limit.min = e.storage.nativerangelimitmin;
          config.native.metrics.range.limit.max = e.storage.nativerangelimitmax;
          config.native.metrics.range.threshold.min = e.storage.nativerangethresholdmin;
          config.native.metrics.range.threshold.max = e.storage.nativerangethresholdmax;
          /*  */
          config.native.metrics.darken.background.shade = e.storage.nativedarkenshade;
          config.native.metrics.darken.background.image = e.storage.nativedarkenimage;
          config.native.metrics.darken.variable.gradient = e.storage.nativedarkenvariable;
          config.native.metrics.darken.background.gradient = e.storage.nativedarkengradient;
          /*  */
          config.native.metrics.force.color.font = e.storage.nativeforcefont;
          config.native.metrics.force.color.border = e.storage.nativeforceborder;
          config.native.metrics.force.color.svgfill = e.storage.nativeforcesvgfill;
          config.native.metrics.force.width.border = e.storage.nativeforceborderwidth;
          config.native.metrics.force.color.boxshadow = e.storage.nativeforceboxshadow;
          config.native.metrics.force.color.svgstroke = e.storage.nativeforcesvgstroke;
          config.native.metrics.force.color.textshadow = e.storage.nativeforcetextshadow;
          config.native.metrics.force.color.background = e.storage.nativeforcebackground;
          config.native.metrics.force.color.closetowhite = e.storage.nativeforceclosetowhite;
          config.native.metrics.force.color.transparency = e.storage.nativeforcetransparency;
          config.native.metrics.force.color.backgroundcolor = e.storage.nativeforcebackgroundcolor;
          config.native.metrics.force.color.closetowhitemin = e.storage.nativeforceclosetowhitemin;
          config.native.metrics.force.color.closetowhitemax = e.storage.nativeforceclosetowhitemax;
          config.native.metrics.force.color.closetowhitepercent = e.storage.nativeforceclosetowhitepercent;
          /*  */
          config.native.metrics.inline = e.storage.nativeinline;
          config.native.metrics.recheck = e.storage.nativerecheck;
          config.native.metrics.asstyle = e.storage.nativeasstyle;
          config.native.metrics.colorful = e.storage.nativecolorful;
          config.native.metrics.priority = e.storage.nativepriority;
          config.native.metrics.continue = e.storage.nativecontinue;
          config.native.metrics.supports = e.storage.nativesupports;
          config.native.metrics.deeprules = e.storage.nativedeeprules;
          config.page.metrics.documentroot = e.storage.documentroot;
          config.native.metrics.classname = e.storage.nativeclassname;
          config.native.metrics.keyframes = e.storage.nativekeyframes;
          config.native.metrics.mediaquery = e.storage.nativemediaquery;
          config.page.metrics.checkstylesheet = e.storage.checkstylesheet;
          config.native.metrics.mapcssvariables = e.storage.mapcssvariables;
          config.native.metrics.cssstylesheet = e.storage.nativecssstylesheet;
          config.page.metrics.rechecktimeout = e.storage.nativerechecktimeout;
          config.native.metrics.background.blend = e.storage.nativebackgroundblend;
          config.native.metrics.background.related = e.storage.nativebackgroundrelated;
          config.native.metrics.background.initial = e.storage.nativebackgroundinitial;
          config.native.metrics.background.fallback = e.storage.nativebackgroundfallback;
          config.native.metrics.performanceobserver = e.storage.nativeperformanceobserver;
          config.native.metrics.background.transparency = e.storage.nativebackgroundtransparency;
          /*  */
          config.native.metrics.best.pageload = e.storage.nativebestpageload;
          config.native.metrics.best.performance = e.storage.nativebestperformance;
          /*  */
          config.page.metrics.exclude.iframes = e.storage.excludeiframes;
          config.page.metrics.exclude.csscolorscheme = e.storage.excludecsscolorscheme;
          config.page.metrics.exclude.darkbackground = e.storage.excludedarkbackground;
          config.page.metrics.exclude.incolorschemedark = e.storage.excludeincolorschemedark;
          config.page.metrics.exclude.darkbackgroundnative = e.storage.excludedarkbackgroundnative;
          config.page.metrics.exclude.darkbackgroundthreshold = e.storage.excludedarkbackgroundthreshold;
          /*  */
          config.native.metrics.colorfulmap = {
            "svg": e.storage["nativecolorful-svg"] !== undefined ? e.storage["nativecolorful-svg"] : false,
            "font": e.storage["nativecolorful-font"] !== undefined ? e.storage["nativecolorful-font"] : false,
            "border": e.storage["nativecolorful-border"] !== undefined ? e.storage["nativecolorful-border"] : false,
            "background": e.storage["nativecolorful-background"] !== undefined ? e.storage["nativecolorful-background"] : true
          };
          /*  */
          config.smart.metrics.blue = e.storage["smartblue"] !== undefined ? e.storage.smartblue : true;
          config.smart.metrics.deep = e.storage["smartdeep"] !== undefined ? e.storage.smartdeep : true;
          config.smart.metrics.color = e.storage["smartcolor"] !== undefined ? e.storage.smartcolor : 0.70;
          config.smart.metrics.yellow = e.storage["smartyellow"] !== undefined ? e.storage.smartyellow : true;
          config.smart.metrics.mintext = e.storage["smartmintext"] !== undefined ? e.storage.smartmintext : 0.72;
          config.smart.metrics.darkness = e.storage["smartdarkness"] !== undefined ? e.storage.smartdarkness : 0.26;
          /*  */
          const darkness = config.check.darkness(e.storage);
          if (darkness) {
            config.native.metrics.darkness = darkness;
            return config.style.clear(e, 2);
          }
          /*  */
          const loaded = document.readyState === "complete";
          const darkcolor = loaded ? config.check.darkcolor.page(0) : false;
          if (darkcolor) {
            return config.style.remove(0);
          }
          /*  */
          const hostname = e.hostname ? e.hostname : config.hostname(page);
          if (e.storage.inclusiveaction) {
            const target = hostname ? hostname : page;
            if (e.storage.inclusivelist.indexOf(target) === -1) {
              if (e.storage.colortemperature) {
                config.colortemperature.render(e);
              }
              //
              return config.style.clear(e, 3);
            }
          }
          /*  */
          if (e.storage.whitelist) {
            for (let i = 0; i < e.storage.whitelist.length; i++) {
              const target = hostname ? hostname : page;
              if (e.storage.whitelist[i] === target) {
                return config.style.clear(e, 4);
              }
            }
          }
          /*  */
          const uri = e.uri ? e.uri : decodeURIComponent(page);
          const options = {
            "reload": e.reload,
            "recheck": e.recheck,
            "frameId": e.frameId,
            "cssstylesheet": e.storage.nativecssstylesheet,
            "temporarilydelay": e.storage.temporarilydelay,
            "temporarilyaction": e.storage.temporarilyaction,
            "temporarilydisplay": e.storage.temporarilydisplay,
            "temporarilythreshold": e.storage.temporarilythreshold,
            "temporarilysimpledark": e.storage.temporarilysimpledark,
            "temporarilybrightness": e.storage.temporarilybrightness
          };
          /*  */
          for (let name in website.custom.regex.rules) {
            const cond_0 = config.page.metrics.respect === true;
            const cond_1 = config.page.metrics.ignore === false;
            const cond_2 = config.page.metrics.compatible === false;
            const cond_3 = config.page.metrics.compatible === true && e.compatible.indexOf(name) === -1;
            /*  */
            let usecustom = cond_0 || (cond_1 && (cond_2 || cond_3));
            if (usecustom) {
              if (e.storage[name]) {
                let rule = new RegExp(website.custom.regex.rules[name]);
                if (rule.test(uri)) {
                  let href_g = config.addon.state === "dark" ? chrome.runtime.getURL("data/content_script/custom/dark.css") : '';
                  let href_c = config.addon.state === "dark" ? chrome.runtime.getURL("data/content_script/custom/" + name + ".css") : '';
                  /*  */
                  href_g = website.exclude.from.custom.dark.mode.indexOf(name) === -1 ? href_g : '';
                  /*  */
                  config.style.apply({
                    "loc": 1,
                    "text_c": '',
                    "text_n": '',
                    "text_s": '',
                    "href_g": href_g,
                    "href_c": href_c,
                    "options": options
                  });
                  /*  */
                  return;
                }
              }
            }
          }
          /*  */
          if (website.theme.number.active) {
            if (website.theme.number.active === website.theme.number.custom) {
              const text_c = e.storage.custom;
              /*  */
              config.style.apply({
                "loc": 2, 
                "href_g": '',
                "href_c": '',
                "text_n": '',
                "text_s": '',
                "text_c": text_c,
                "options": options
              });
            } else if (config.native.selected) {
              const rules = config.native.metrics.css.rules;
              const variables = JSON.stringify(config.native.metrics.css.variables, null, 2).replace(/\"/g, '').replace(/\,\n/g, ";\n");
              const text_n = ":root, ::after, ::before, ::backdrop " + variables + "\n\n" + rules;
              /*  */
              config.style.apply({
                "loc": 3, 
                "href_g": '',
                "href_c": '',
                "text_c": '',
                "text_s": '',
                "text_n": text_n,
                "options": options
              });
            } else if (config.smart.selected) {
              config.style.apply({
                "loc": 3, 
                "href_g": '',
                "href_c": '',
                "text_c": '',
                "text_n": '',
                "text_s": "smart",
                "options": options
              });
            } else {
              let href_g = chrome.runtime.getURL("data/content_script/general/dark_" + website.theme.number.active + ".css");
              /*  */
              config.style.apply({
                "loc": 4, 
                "href_c": '',
                "text_c": '',
                "text_n": '',
                "text_s": '',
                "href_g": href_g,
                "options": options
              });
            }
          } else {
            config.style.clear(e, 5);
          }
          /*  */
          if (config.page.metrics.exclude.iframes) {
            if (e.frameId !== 0) {
              window.top.postMessage({
                "frameId": e.frameId,
                "from": "native-dark-context-iframe-for-exclude"
              }, '*');
            }
          }
        } else {
          if (e.storage.colortemperature) {
            config.colortemperature.render(e);
          }
          /*  */
          config.style.clear(e, 6);
        }
      } catch (e) {
        if (config.log) {
          console.error(e);
        }
      }
    }
  },
  "smart": {
    "selected": false,
    "metrics": {
      "blue": true,
      "deep": true,
      "color": 0.70,
      "yellow": true,
      "mintext": 0.72,
      "darkness": 0.26
    }
  },
  "page": {
    "metrics": {
      "ignore": false,
      "respect": false,
      "compatible": true,
      "rechecktimeout": 0,
      "darknessstorage": {},
      "documentroot": false,
      "checkstylesheet": true,
      "temporarily": {
        "delay": 200,
        "action": true,
        "display": true,
        "threshold": 1000,
        "brightness": false
      },
      "exclude": {
        "iframes": false,
        "csscolorscheme": true,
        "darkbackground": true,
        "incolorschemedark": true,
        "darkbackgroundnative": false,
        "darkbackgroundthreshold": 128
      }
    }
  },
  "native": {
    "selected": true,
    "stylesheet": null,
    "style": document.getElementById("dark-mode-native-style"),
    "sheet": document.getElementById("dark-mode-native-sheet"),
    "metrics": {
      "inline": false,
      "recheck": true,
      "asstyle": false,
      "colorful": true,
      "continue": false,
      "priority": false,
      "colorfulmap": {},
      "darkness": false,
      "classname": false,
      "keyframes": false,
      "mediaquery": false,
      "cssstylesheet": false,
      "mapcssvariables": true,
      "performanceobserver": false,
      "css": {
        "rules": '',
        "variables": ''
      },
      "best": {
        "pageload": false,
        "performance": true
      },
      "remove": {
        "background": {
          "image": true
        }
      },
      "background": {
        "blend": true,
        "related": true,
        "initial": true,
        "fallback": true,
        "transparency": 10
      },
      "darken": {
        "variable": {
          "gradient": false
        },
        "background": {
          "image": true,
          "gradient": true,
          "shade": "linear-gradient(hsla(0, 0%, 0%, 0.85), hsla(0, 0%, 0%, 0.75))"
        }
      },
      "range": {
        "limit": {
          "min": 10,
          "max": 90
        },
        "threshold": {
          "min": 10,
          "max": 10
        }
      },
      "force": {
        "width": {
          "border": false
        },
        "color": {
          "font": true,
          "border": true,
          "svgfill": true,
          "svgstroke": true,
          "boxshadow": true,
          "textshadow": true,
          "background": false,
          "transparency": true,
          "closetowhite": true,
          "closetowhitemin": 5,
          "closetowhitemax": 95,
          "backgroundcolor": true,
          "closetowhitepercent": 10
        }
      }
    }
  }
};

config.start();

background.receive("content", config.content);
background.receive("storage", config.render.post);

window.addEventListener("load", config.load, false);
window.addEventListener("message", config.message, false);
