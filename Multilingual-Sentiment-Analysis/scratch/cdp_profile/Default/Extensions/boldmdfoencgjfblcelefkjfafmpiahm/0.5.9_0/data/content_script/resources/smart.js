var smart = {
  "load": function () {
    /*  */
  },
  "message": function (e) {
    const state = smart.dark.state;
    const engine = smart.dark.engine;
    /*  */
    try {
      if (!e || e.source !== window || !e.data) return;
      if (e.data.from !== "smart-dark-context") return;
      if (state.active !== true) return;
      /*  */
      if (e.data.type === "shadow") {
        engine.watch.reset("shadow", function () {
          engine.shadow.discover();
        }, 100);
      } else {
        engine.watch.reset("sheet", function () {
          engine.refresh();
        }, 120);
      }
    } catch (e) {
      if (config.log) {
        console.error(e);
      }
    }
  },
  "content": function (e) {
    const state = smart.dark.state;
    const engine = smart.dark.engine;
    let previous = state.batching;
    /*  */
    try {
      if (state.active !== true) {
        if (config.log) console.error("smart content drop (inactive): " + (e && e.href ? e.href : ''));
        return;
      }
      /*
        an empty content is a legit reply (fonts/images-only CSS): the applied stamp below unblocks the cover
      */
      if (!e || !e.href) return;
      /*  */
      const entry = state.fetching[e.href];
      if (!entry) {
        if (config.log) console.error("smart content drop (entry): " + e.href);
        return;
      }
      /*  */
      entry.generation = state.generation;
      /*
        any reply unblocks the cover:
        an empty conversion (fonts/images-only sheet) must not stay pending forever (2s cover + ready-loop on every later render)
      */
      entry.applied = Date.now();
      /*  */
      const sheet = new CSSStyleSheet({"baseURL": e.href});
      sheet.replaceSync(e.content);
      engine.walk.variables(sheet);
      /*  */
      const text = engine.walk.text(sheet);
      if (!text) return;
      /*  */
      const targets = entry.targets || [{"root": null, "media": entry.media || ''}];
      entry.wrappers = entry.wrappers || [];
      state.batching = true;
      /*  */
      for (const target of targets) {
        const reuse = entry.wrappers.find(function (item) {
          return item.root === (target.root || null) && item.media === target.media;
        });
        /*  */
        const wrapper = target.root ? engine.attach.shadow(target.root, text, target.media, reuse ? reuse.wrapper : null) : engine.attach.document(text, target.media, reuse ? reuse.wrapper : null);
        if (wrapper) {
          if (reuse) reuse.wrapper = wrapper;
          else entry.wrappers.push({"root": target.root || null, "media": target.media, "wrapper": wrapper});
          /*  */
          if (target.root) engine.shadow.track(target.root, wrapper);
          if (!reuse) engine.list.sheets.push({"wrapper": wrapper, "level": target.root ? "shadow" : "document", "root": target.root || null});
        }
      }
      /*  */
      state.batching = previous;
      engine.watch.reset("remote-" + e.href, function () {
        if (state.active !== true) return;
        /*  */
        engine.attach.commit();
        engine.inline.sweep(document.documentElement);
        engine.deep.computed(document.documentElement);
        /*  */
        for (const target of targets) {
          if (target.root) engine.deep.computed(target.root);
        }
        /*  */
        if (config.log) console.error("smart remote: " + e.href + " targets " + targets.length);
        let pending = 0;
        for (const href in state.fetching) {
          if (state.fetching[href] && !state.fetching[href].applied) pending++;
        }
        /*  */
        if (!pending && config.temporarily.is.removed) {
          const delay = config.page.metrics.temporarily.delay !== undefined ? Number(config.page.metrics.temporarily.delay) : 200;
          config.temporarily.remove(delay, 8);
        }
      }, 40);
    } catch (e) {
      state.batching = previous;
      /*
        a mid-loop throw must not orphan sheets already queued in pending/pendingroot (created but never attached while entry.applied already marks the entry done)
      */
      engine.attach.commit();
      if (config.log) {
        console.error(e);
      }
    }
  },
  "dark": {
    "log": false,
    "object": {
      "cssstylesheet": "smart-dark-object-cssstylesheet"
    },
    "attribute": {
      "theme": "smart-dark-active"
    },
    "say": function (msg) {
      try {
        if (smart.dark.state.log) {
          console.error("smart " + msg);
        }
      } catch (e) {}
    },
    "theme": {
      "text": "#e5e5e5",
      "muted": "#a8a8a8",
      "border": "#4a4a4a",
      "anchor": "#8db2e5",
      "visited": "#c76ed7",
      "control": "#303030",
      "selection": "#405a78",
      "background": "#1c1c1c",
      "imageveil": "rgba(0, 0, 0, 0.25)"
    },
    "state": {
      "lates": 0,
      "readies": 0,
      "log": false,
      "shell": null,
      "pending": [],
      "fetching": {},
      "baseline": [],
      "latestamp": 0,
      "proxy": false,
      "active": false,
      "queued": false,
      "hidden": false,
      "request": null,
      "generation": 0,
      "arrived": false,
      "pendingroot": [],
      "darkpage": false,
      "batching": false,
      "deferred": false,
      "processing": false,
      "darkpinned": false,
      "internal": new WeakMap(),
      "computed": {
        "items": [],
        "sheets": [],
        "sequence": 0,
        "nodes": new WeakMap()
      }
    },
    "engine": {
      "is": {
        "active": false
      },
      "option": {
        "defaults": {
          "sat": 0.70,
          "blue": true,
          "deep": true,
          "limit": 0.26,
          "yellow": true,
          "mintext": 0.72,
          /*
            smart-owned shared-surface defaults (decoupled from the native advanced options):
            imagegate = photo/veil filter stays active, veilbrightness = photo dim strength,
            cssproxy = MAIN-world CSSOM/shadow patch (closed-shadow door) stays OFF
          */
          "imagegate": true,
          "cssproxy": false,
          "veilbrightness": 0.85
        },
        "ranges": {
          "sat": [0.20, 1.00],
          "limit": [0.20, 0.80],
          "mintext": [0.40, 0.80]
        },
        "values": {},
        "load": function () {
          const option = smart.dark.engine.option;
          /*  */
          try {
            const page = config.smart && config.smart.metrics ? config.smart.metrics : {};
            const before = JSON.stringify(option.values);
            /*  */
            const mapping = {
              "deep": {"key": "deep"},
              "blue": {"key": "blue"},
              "yellow": {"key": "yellow"},
              "color": {"key": "sat", "range": true},
              "darkness": {"key": "limit", "range": true},
              "mintext": {"key": "mintext", "range": true}
            };
            /*  */
            for (const name in mapping) {
              const value = page[name];
              if (value === undefined || value === null) continue;
              /*  */
              const entry = mapping[name];
              const range = option.ranges[entry.key];
              if (range) {
                const number = typeof value === "number" ? value : parseFloat(value);
                if (!isNaN(number)) option.values[entry.key] = Math.min(Math.max(number, range[0]), range[1]);
              } else {
                option.values[entry.key] = value === true || value === "true";
              }
            }
            /*
              blue/yellow/deep stay engine defaults (true) until their options exist
            */
            return JSON.stringify(option.values) !== before;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return false;
          }
        }
      },
      "render": function (options) {
        const state = smart.dark.state;
        const engine = smart.dark.engine;
        /*  */
        state.request = options || {};
        config.temporarily.is.removed = true;
        if (document.documentElement) document.documentElement.setAttribute(config.temporarily.id.start, '');
        /*  */
        if (state.processing) {
          state.queued = true;
          return;
        }
        /*  */
        state.processing = true;
        engine.process();
      },
      "shadow": {
        "roots": [],
        "register": function (root, host) {
          const engine = smart.dark.engine;
          const shadow = engine.shadow;
          /*  */
          try {
            if (!root) return;
            for (const item of shadow.roots) {
              if (item.root === root) return;
            }
            /*  */
            const item = {
              "root": root,
              "timer": null,
              "dirty": false,
              "wrappers": [],
              "observer": null,
              "host": host || null,
              "sheets": new WeakSet()
            };
            /*  */
            item.observer = new MutationObserver(function (mutations) {
              if (smart.dark.state.active !== true) return;
              /*  */
              for (const mutation of mutations) {
                if (mutation.type === "attributes" && mutation.attributeName === "style") {
                  const writes = smart.dark.state.internal.get(mutation.target) || 0;
                  if (writes) {
                    if (writes > 1) smart.dark.state.internal.set(mutation.target, writes - 1);
                    else smart.dark.state.internal.delete(mutation.target);
                    continue;
                  }
                }
                /*  */
                if (mutation.target && /^(STYLE|LINK)$/.test(mutation.target.tagName || '')) item.dirty = true;
                for (const node of mutation.addedNodes || []) {
                  if (node.nodeType === 1 && /^(STYLE|LINK)$/.test(node.tagName)) item.dirty = true;
                }
              }
              /*  */
              if (item.timer) window.clearTimeout(item.timer);
              item.timer = window.setTimeout(function () {
                item.timer = null;
                shadow.scan(item);
              }, 100);
            });
            /*  */
            item.observer.observe(root, {
              "subtree": true,
              "childList": true,
              "attributes": true,
              "attributeFilter": [
                "style",
                "class",
                "hidden",
                "open",
                "disabled",
                "aria-expanded",
                "aria-selected",
                "data-state",
                "data-theme"
              ]
            });
            /*  */
            shadow.roots.push(item);
            shadow.scan(item);
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "scan": function (item) {
          const engine = smart.dark.engine;
          const shadow = engine.shadow;
          /*  */
          try {
            if (!item || !item.root || smart.dark.state.active !== true) return;
            const root = item.root;
            if (item.dirty) {
              const current = [...root.adoptedStyleSheets];
              /*  */
              for (const wrapper of item.wrappers) {
                const index = current.indexOf(wrapper);
                if (index !== -1) current.splice(index, 1);
                const position = engine.list.sheets.findIndex(function (entry) { return entry.wrapper === wrapper; });
                if (position !== -1) engine.list.sheets.splice(position, 1);
              }
              /*  */
              root.adoptedStyleSheets = current;
              item.wrappers = [];
              item.sheets = new WeakSet();
              item.dirty = false;
            }
            /*  */
            const sheets = new Set([...(root.styleSheets || []), ...(root.adoptedStyleSheets || [])]);
            const styled = root.querySelectorAll("style, link[rel=stylesheet]");
            /*  */
            for (let i = 0; i < styled.length; i++) {
              if (styled[i].sheet) sheets.add(styled[i].sheet);
            }
            /*  */
            if (!smart.dark.state.darkpage) {
              for (const sheet of sheets) {
                if (!sheet || sheet[smart.dark.object.cssstylesheet] === true) continue;
                const record = engine.attach.record(sheet);
                if (!record) continue;
                if (item.sheets.has(sheet) && record.dirty === false) continue;
                item.sheets.add(sheet);
                if (record.wrapper === null && record.vars === false) engine.walk.variables(sheet);
                /*  */
                let count = 0;
                try {count = sheet.cssRules ? sheet.cssRules.length : 0;} catch (ex) {count = 0;}
                const key = engine.attach.key(sheet);
                /*  */
                if (record.wrapper !== null && record.count === count && record.key === key && record.dirty === false) continue;
                record.key = key;
                record.vars = true;
                record.dirty = false;
                record.count = count;
                /*  */
                if (engine.walk.print(sheet.media && sheet.media.mediaText)) continue;
                /*  */
                const text = engine.walk.text(sheet, record);
                const media = sheet.media && sheet.media.mediaText ? sheet.media.mediaText : '';
                if (text) {
                  const wrapper = engine.attach.shadow(root, text, media, record.wrapper);
                  if (wrapper) {
                    record.wrapper = wrapper;
                    if (item.wrappers.indexOf(wrapper) === -1) item.wrappers.push(wrapper);
                    if (record.pushed !== true) {
                      record.pushed = true;
                      engine.list.sheets.push({"wrapper": wrapper, "level": "shadow", "root": root, "record": record});
                    }
                  }
                } else if (record.wrapper) {
                  record.wrapper.replaceSync('');
                } else if (sheet.href) {
                  engine.attach.remote(sheet, root);
                }
              }
            }
            /*  */
            const nested = root.querySelectorAll("*");
            /*  */
            for (let i = 0; i < nested.length; i++) {
              if (nested[i].shadowRoot) shadow.register(nested[i].shadowRoot, nested[i]);
            }
            /*  */
            engine.inline.attach(root);
            const inline = root.querySelectorAll("[style]");
            for (let i = 0; i < inline.length; i++) {
              engine.inline.element(inline[i]);
            }
            /*  */
            engine.deep.computed(root);
            if (item.host) engine.deep.computed(item.host);
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "track": function (root, wrapper) {
          const shadow = smart.dark.engine.shadow;
          /*  */
          try {
            for (const item of shadow.roots) {
              if (item.root === root && item.wrappers.indexOf(wrapper) === -1) {
                item.wrappers.push(wrapper);
                return;
              }
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "discover": function (source) {
          const engine = smart.dark.engine;
          const shadow = engine.shadow;
          /*  */
          try {
            const before = shadow.roots.length;
            const nodes = source && source.nodeType === 1 ? [source, ...source.querySelectorAll("*")] : document.querySelectorAll("*");
            /*  */
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].shadowRoot) shadow.register(nodes[i].shadowRoot, nodes[i]);
            }
            /*  */
            if (config.log && shadow.roots.length > before) console.error("smart shadow roots: +" + (shadow.roots.length - before) + " (" + shadow.roots.length + " total)");
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "stop": function () {
          const shadow = smart.dark.engine.shadow;
          /*  */
          try {
            for (const item of shadow.roots) {
              if (item.timer) window.clearTimeout(item.timer);
              if (item.observer) item.observer.disconnect();
            }
            /*  */
            shadow.roots = [];
            smart.dark.state.lates = 0;
            smart.dark.state.latestamp = 0;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "rearm": function () {
          const engine = smart.dark.engine;
          const state = smart.dark.state;
          /*  */
          try {
            if (state.active !== true) return;
            const now = Date.now();
            if (state.latestamp && now - state.latestamp < 60000) return;
            /*
              throttle stamp: each rearm grants two more late rounds — bounded forever, never an unbounded loop
            */
            state.latestamp = now;
            state.lates = 2;
            smart.dark.say("late rearm: custom host without shadow root");
            engine.watch.reset("late", engine.shadow.late, 250);
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "late": function () {
          const engine = smart.dark.engine;
          const state = smart.dark.state;
          /*  */
          try {
            if (state.active !== true) return;
            if (state.lates >= 4) return;
            state.lates++;
            const before = engine.shadow.roots.length;
            engine.shadow.discover();
            for (const item of engine.shadow.roots) engine.shadow.scan(item);
            /*  */
            if (engine.shadow.roots.length > before) smart.dark.say("late scan: " + (engine.shadow.roots.length - before) + " new root(s)");
            engine.watch.reset("late", engine.shadow.late, 1000);
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        }
      },
      "color": {
        "compare": {
          "checking": null,
          "matching": null
        },
        "visible": 3.0,
        "varversion": 0,
        "cache": new Map(),
        "tokens": new Map(),
        "variables": new Map(),
        "pole": {
          "text": null,
          "background": null
        },
        "prepare": function () {
          const color = smart.dark.engine.color;
          /*  */
          try {
            const option = smart.dark.engine.option;
            for (const name in option.defaults) {
              if (option.values[name] === undefined) option.values[name] = option.defaults[name];
            }
            /*  */
            const escaped = (website && website.color.names ? website.color.names : []).map(function (item) {
              return item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            }).join("|");
            /*  */
            const tiny_tx = tinycolor(smart.dark.theme.text);
            const tiny_bg = tinycolor(smart.dark.theme.background);
            const funcs = "rgba?|hsla?|hwb|color|lab|oklab|lch|oklch|light-dark";
            const pattern = "(#[0-9a-f]{3,8}\\b|(?:" + funcs + ")\\([^()]*\\)|\\b(?:" + escaped + ")\\b)";
            /*  */
            color.compare.checking = new RegExp(pattern, "i");
            color.compare.matching = new RegExp(pattern, "ig");
            color.pole.text = tiny_tx && tiny_tx.isValid ? tiny_tx.toHsl() : null;
            color.pole.background = tiny_bg && tiny_bg.isValid ? tiny_bg.toHsl() : null;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "anchor": function (hue, saturation, lightness, pole, weight) {
          try {
            if (!pole || weight <= 0) return {"h": hue, "s": saturation, "l": lightness};
            /*  */
            const w = Math.min(Math.max(weight, 0), 1);
            let delta = pole.h - hue;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            /*  */
            return {
              "h": (hue + delta * w + 360) % 360,
              "l": lightness + (pole.l - lightness) * w,
              "s": saturation + (pole.s - saturation) * w
            };
          } catch (e) {
            return {
              "h": hue,
              "l": lightness,
              "s": saturation
            };
          }
        },
        "match": function (value) {
          const found = [];
          const color = smart.dark.engine.color;
          /*  */
          try {
            if (!value || !color.compare.checking.test(value)) return found;
            /*  */
            const regex = color.compare.matching;
            regex.lastIndex = 0;
            let piece = regex.exec(value);
            /*  */
            while (piece) {
              found.push({"text": piece[0], "from": piece.index, "to": piece.index + piece[0].length});
              piece = regex.exec(value);
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
          /*  */
          return found;
        },
        "stringify": function (color) {
          const lightness = Math.round(Math.min(Math.max(color.l || 0, 0), 1) * 1000) / 10;
          const saturation = Math.round(Math.min(Math.max(color.s || 0, 0), 1) * 1000) / 10;
          const hue = color.h === undefined || color.h === null || isNaN(color.h) ? 0 : Math.round(color.h) % 360;
          const alpha = color.a === undefined || color.a === null ? 1 : Math.round(Math.min(Math.max(color.a, 0), 1) * 100) / 100;
          /*  */
          return "hsla(" + hue + ", " + saturation + "%, " + lightness + "%, " + alpha + ")";
        },
        "transform": function (input, kind) {
          const color = smart.dark.engine.color;
          const option = smart.dark.engine.option.values;
          const source = input && typeof input === "object" ? input : {};
          /*  */
          let lightness = Math.min(Math.max(source.l || 0, 0), 1);
          let saturation = Math.min(Math.max(source.s || 0, 0), 1);
          let hue = source.h === undefined || source.h === null || isNaN(source.h) ? 0 : source.h;
          let alpha = source.a === undefined || source.a === null ? 1 : Math.min(Math.max(source.a, 0), 1);
          /*
            colored ceiling: brand hues with real chroma keep identity and darken gently (L ~18%), neutrals take the deep curve
          */
          const colored = saturation >= 0.15 && (kind === "surface" || kind === "control" || kind === "background");
          /*  */
          if (kind === "text-shadow") {
            saturation = 0;
            lightness = 0.04;
            alpha = alpha * 0.35;
          } else if (kind === "text") {
            saturation = saturation * option.sat;
            lightness = option.mintext + lightness * (0.92 - option.mintext);
            if (saturation < 0.12) saturation = 0;
          } else if (kind === "accent") {
            lightness = Math.min(Math.max(lightness < 0.48 ? lightness + 0.24 : lightness + 0.08, 0.42), 0.72);
            saturation = Math.min(saturation * 0.85, 0.90);
          } else if (kind === "surface") {
            if (colored) {
              lightness = 0.18 + (lightness - 0.18) * 0.15;
              saturation = Math.min(saturation * 1.10, 0.90);
            } else {
              saturation = saturation * 0.72;
              lightness = 0.05 + (Math.min(option.limit - 0.04, 0.18) - 0.05) * Math.pow(lightness, 1.15);
            }
          } else if (kind === "control") {
            if (colored) {
              lightness = 0.20 + (lightness - 0.20) * 0.15;
              saturation = Math.min(saturation * 1.10, 0.90);
            } else {
              saturation = saturation * 0.78;
              lightness = 0.11 + (Math.min(option.limit - 0.01, 0.22) - 0.11) * Math.pow(lightness, 1.05);
            }
          } else if (kind === "border") {
            saturation = saturation * 0.50;
            lightness = Math.min(Math.max(lightness * 0.42, 0.24), 0.40);
          } else if (kind === "shadow") {
            saturation = saturation * 0.50;
            lightness = Math.min(Math.max(lightness * 0.35, 0.08), 0.30);
            alpha = alpha * 0.55;
          } else {
            if (colored) {
              lightness = 0.18 + (lightness - 0.18) * 0.15;
              saturation = Math.min(saturation * 1.10, 0.90);
            } else {
              lightness = 0.05 + (option.limit - 0.05) * Math.pow(lightness, 1.35);
            }
          }
          /*
            pole anchoring: neutrals blend toward theme endpoints, saturated colors keep identity
          */
          if (kind !== "text-shadow" && !colored) {
            const neutrality = Math.min(Math.max(1 - saturation * 1.6, 0), 1);
            /*  */
            if (neutrality > 0.01) {
              const isforeground = kind === "text" || kind === "accent";
              const isedge = kind === "border" || kind === "shadow";
              const pole = isforeground ? color.pole.text : color.pole.background;
              const gain = isforeground ? 0.85 : (isedge ? 0.35 : (kind === "background" ? 0.85 : 0.70));
              const weight = gain * neutrality;
              const anchored = color.anchor(hue, saturation, lightness, pole, weight);
              /*  */
              hue = anchored.h;
              lightness = anchored.l;
              saturation = anchored.s;
            }
          }
          /*  */
          if (saturation > 0.10) {
            if (option.blue && hue >= 195 && hue <= 265) {
              const lowered = hue < 230;
              saturation = saturation * (lowered ? 0.85 : 0.70);
              hue = lowered ? 205 + (hue - 195) * 0.50 : 220;
            }
            /*  */
            if (option.yellow && hue > 35 && hue < 100) saturation = saturation * 0.55;
            if (kind === "text" && hue >= 40 && hue <= 85) lightness = lightness * 0.80;
          }
          /*  */
          return {"h": hue, "s": saturation, "l": lightness, "a": alpha};
        },
        "resolve": function (input, depth) {
          const color = smart.dark.engine.color;
          const level = depth || 0;
          /*  */
          try {
            if (level > 8 || input === undefined || input === null) return input === undefined || input === null ? '' : String(input);
            const protected_ = color.protect(String(input));
            let output = '';
            let index = 0;
            /*  */
            while (index < protected_.text.length) {
              if (protected_.text.slice(index, index + 11).toLowerCase() === "light-dark(") {
                /*  */
                let end = index + 11;
                let nesting = 1;
                let comma = -1;
                /*  */
                while (end < protected_.text.length && nesting) {
                  const char = protected_.text[end];
                  if (char === "(") nesting++;
                  if (char === ")") nesting--;
                  if (char === "," && nesting === 1 && comma === -1) comma = end;
                  end++;
                }
                /*  */
                if (nesting) {
                  output += protected_.text.slice(index);
                  break;
                }
                /*  */
                const bodyEnd = end - 1;
                const dark = comma === -1 ? '' : protected_.text.slice(comma + 1, bodyEnd).trim();
                if (dark) output += color.resolve(dark, level + 1);
                else output += protected_.text.slice(index, end);
                /*  */
                index = end;
                continue;
              }
              /*  */
              if (protected_.text.slice(index, index + 4).toLowerCase() !== "var(") {
                output += protected_.text[index++];
                continue;
              }
              /*  */
              let end = index + 4;
              let nesting = 1;
              let comma = -1;
              /*  */
              while (end < protected_.text.length && nesting) {
                const char = protected_.text[end];
                if (char === "(") nesting++;
                if (char === ")") nesting--;
                if (char === "," && nesting === 1 && comma === -1) comma = end;
                end++;
              }
              /*  */
              if (nesting) {
                output += protected_.text.slice(index);
                break;
              }
              /*  */
              const bodyEnd = end - 1;
              const nameEnd = comma === -1 ? bodyEnd : comma;
              const name = protected_.text.slice(index + 4, nameEnd).trim();
              const fallback = comma === -1 ? '' : protected_.text.slice(comma + 1, bodyEnd).trim();
              const replacement = color.variables.has(name) ? color.variables.get(name) : fallback;
              /*  */
              if (replacement) output += color.resolve(replacement, level + 1);
              else output += protected_.text.slice(index, end);
              /*  */
              index = end;
            }
            /*  */
            return color.restore(output, protected_);
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return String(input);
          }
        },
        "convert": function (input, kind) {
          const color = smart.dark.engine.color;
          /*  */
          try {
            if (input === undefined || input === null) return '';
            /*  */
            const value = color.resolve(input);
            const key = kind + "|" + color.varversion + "|" + value;
            const cached = color.cache.get(key);
            /*  */
            if (cached !== undefined) return cached;
            const protected_ = color.protect(value);
            /*  */
            if (!color.compare.checking.test(protected_.text)) {
              color.cache.set(key, value);
              return value;
            }
            /*  */
            const found = [];
            const regex = color.compare.matching;
            regex.lastIndex = 0;
            const changed = protected_.text.replace(regex, function (match) {
              const wrought = color.wrought(match, kind, found);
              return wrought ? wrought : match;
            });
            /*  */
            const result = color.restore(changed, protected_);
            color.cache.set(key, result);
            if (found.length) color.tokens.set(key, {"kind": kind, "value": value, "tokens": found});
            /*
              memory bound: token-heavy pages (design systems) can push thousands of unique keys
            */
            if (color.cache.size > 6000) color.cache.clear();
            /*  */
            return result;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return input ? String(input) : '';
          }
        },
        "contrast": function (one, two) {
          try {
            const a = tinycolor(one), b = tinycolor(two);
            if (!a || !a.isValid || !b || !b.isValid) return 0;
            const la = a.getLuminance(), lb = b.getLuminance();
            const hi = Math.max(la, lb), lo = Math.min(la, lb);
            return (hi + 0.05) / (lo + 0.05);
          } catch (e) {
            return 0;
          }
        },
        "wrought": function (input, kind, sink) {
          const color = smart.dark.engine.color;
          /*  */
          try {
            const tiny = tinycolor(input);
            if (!tiny || !tiny.isValid || !tiny.isValid()) return '';
            /*  */
            const hsl = tiny.toHsl();
            if (!hsl || hsl.h === undefined) return '';
            /*
              visibility gate: a foreground color already visible on the dark background keeps its original value (logos, tinted icons, accent marks)
              per-kind floor: reading text needs the 4.5:1 body-text bar (mid-contrast brand colors 3.0-4.4 are unreadable at body size);
              every other kind keeps the loose 3:1 so icons/accents/brand marks across other sites stay untouched
            */
            if ((kind === "text" || kind === "accent") && (hsl.a === undefined || hsl.a >= 0.5)) {
              const ratio = color.contrast(input, smart.dark.theme.background);
              const floor = kind === "text" ? 4.5 : (color.visible || 3.0);
              if (ratio >= floor) return '';
            }
            /*
              transparency gate: alpha-0 borders/shadows must stay transparent (page designs rely on invisible border lines)
            */
            if ((kind === "border" || kind === "shadow") && hsl.a === 0) return '';
            /*  */
            if (sink) sink.push({"match": input, "hsl": {"h": hsl.h, "s": hsl.s, "l": hsl.l, "a": hsl.a}});
            return color.stringify(color.transform(hsl, kind));
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return '';
          }
        },
        "retheme": function () {
          const color = smart.dark.engine.color;
          /*  */
          try {
            smart.dark.say("retheme: " + color.tokens.size + " tokens");
            if (!color.tokens.size) {
              color.cache.clear();
              smart.dark.engine.walk.reset();
              return;
            }
            /*  */
            for (const [key, entry] of color.tokens) {
              if (!color.cache.has(key)) {
                color.tokens.delete(key);
                continue;
              }
              /*  */
              const map = new Map();
              for (const record of entry.tokens) map.set(record.match, record.hsl);
              const shielded = color.protect(entry.value);
              const regex = color.compare.matching;
              regex.lastIndex = 0;
              /*  */
              const changed = shielded.text.replace(regex, function (match) {
                const hsl = map.get(match);
                return hsl ? color.stringify(color.transform(hsl, entry.kind)) : match;
              });
              /*  */
              color.cache.set(key, color.restore(changed, shielded));
            }
            /*  */
            smart.dark.engine.walk.reset();
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            color.cache.clear();
            color.tokens.clear();
            smart.dark.engine.walk.reset();
          }
        },
        "protect": function (value) {
          let text = "";
          let index = 0;
          const sources = [];
          /*  */
          try {
            while (index < value.length) {
              const char = value[index];
              if (char === "'" || char === "\"") {
                const start = index;
                const quote = char;
                index++;
                /*  */
                while (index < value.length) {
                  if (value[index] === "\\") {
                    index += 2;
                    continue;
                  }
                  /*  */
                  if (value[index] === quote) {
                    index++;
                    break;
                  }
                  /*  */
                  index++;
                }
                /*  */
                sources.push(value.slice(start, index));
                text += "@@" + (sources.length - 1) + "@@";
                /*  */
                continue;
              }
              /*  */
              if (value.slice(index, index + 4).toLowerCase() === "url(") {
                const start = index;
                index += 4;
                /*  */
                while (index < value.length) {
                  const char = value[index];
                  if (char === "\\") {
                    index += 2;
                    continue;
                  }
                  /*  */
                  if (char === "'" || char === "\"") {
                    const quote = char;
                    index++;
                    while (index < value.length) {
                      if (value[index] === "\\") {
                        index += 2;
                        continue;
                      }
                      /*  */
                      if (value[index] === quote) {
                        index++;
                        break;
                      }
                      /*  */
                      index++;
                    }
                    /*  */
                    continue;
                  }
                  /*  */
                  if (char === ")") {
                    index++;
                    break;
                  }
                  /*  */
                  index++;
                }
                /*  */
                sources.push(value.slice(start, index));
                text += "@@" + (sources.length - 1) + "@@";
                continue;
              }
              /*  */
              text += char;
              index++;
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return {"text": String(value), "sources": sources};
          }
          /*  */
          return {"text": text, "sources": sources};
        },
        "restore": function (text, shielded) {
          try {
            return String(text).replace(/@@(\d+)@@/g, function (match, index) {
              const value = shielded.sources[Number(index)];
              return value === undefined ? match : value;
            });
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return String(text);
          }
        }
      },
      "list": {
        "items": [],
        "sheets": []
      },
      "walk": {
        "concerns": function (name) {
          const lowered = String(name).toLowerCase();
          /*
            decoupled from the native advanced force-color options - smart engine always applies (native all-true defaults)
          */
          const force = {};
          /*  */
          if (lowered === "fill") return force.svgfill !== false;
          if (lowered === "stroke") return force.svgstroke !== false;
          if (lowered === "box-shadow") return force.boxshadow !== false;
          if (lowered === "text-shadow") return force.textshadow !== false;
          if (lowered === "background-color") return force.backgroundcolor !== false;
          if (lowered === "background" || lowered === "background-image") return force.background !== false;
          /*  */
          if (lowered.indexOf("color") !== -1) return force.font !== false;
          if (lowered.indexOf("border") !== -1 || lowered.indexOf("outline") !== -1) return force.border !== false;
          /*  */
          return lowered.indexOf("background") !== -1 || lowered.indexOf("gradient") !== -1 || lowered === "backdrop-filter" || lowered === "text-decoration";
        },
        "kinds": function (name, selector) {
          const lowered = String(name).toLowerCase();
          const target = String(selector || '').toLowerCase();
          /*  */
          if (lowered.indexOf("text-shadow") !== -1) return "text-shadow";
          if (lowered.indexOf("shadow") !== -1) return "shadow";
          if (lowered === "accent-color") return "accent";
          if (lowered === "color" || lowered === "fill" || lowered === "stroke" || lowered.indexOf("text-fill") !== -1 || lowered.indexOf("caret") !== -1 || lowered.indexOf("decoration") !== -1) return "text";
          if (lowered.indexOf("border") !== -1 || lowered.indexOf("outline") !== -1) return "border";
          /*  */
          if (lowered.indexOf("background") !== -1 && /(^|[\s,>+~])(button|input|select|textarea)([\s.#:[>+~]|$)/.test(target)) return "control";
          if (lowered.indexOf("background") !== -1 && /(^|[\s,>+~])(html|body|:root|:host|:host-context)([\s.#:[>+~]|$)/.test(target)) return "background";
          if (lowered.indexOf("background") !== -1) return "surface";
          /*  */
          return "background";
        },
        "variableKind": function (name) {
          const lowered = String(name).toLowerCase();
          /*
            link tokens: --link-*, --color-a-default/hover/visited… (boundary a- family) — links are text, not backgrounds
          */
          if (lowered.indexOf("border") !== -1 || lowered.indexOf("outline") !== -1) return "border";
          /*
            foreground family: theme tokens re-declared per section (neutral + brand-hued variants) —
            background classification darkens the token and text flips black/dark-gold across re-renders
          */
          if (lowered.indexOf("text") !== -1 || lowered.indexOf("font") !== -1 || lowered.indexOf("fg") !== -1 || lowered.indexOf("foreground") !== -1) return "text";
          if (lowered.indexOf("interactive") !== -1 || lowered.indexOf("control") !== -1 || lowered.indexOf("button") !== -1) return "control";
          if (lowered.indexOf("link") !== -1 || ((lowered.indexOf("color-a") !== -1 || /(^|[-_])a[-_]/.test(lowered)) && lowered.indexOf("background") === -1 && lowered.indexOf("border") === -1)) return "text";
          if (lowered.indexOf("surface") !== -1 || lowered.indexOf("card") !== -1 || lowered.indexOf("overlay") !== -1 || lowered.indexOf("modal") !== -1 || lowered.indexOf("neutral-background") !== -1) return "surface";
          /*  */
          return "background";
        },
        "print": function (media) {
          try {
            const lowered = String(media || '').toLowerCase();
            if (lowered.indexOf("print") === -1) return false;
            /*
              print-medium styles stay untouched (dark output darkens the printed page); "not print" is a negation, not print-only
            */
            if (lowered.indexOf("not print") !== -1) return false;
            return lowered.indexOf("screen") === -1 && lowered.indexOf("all") === -1;
          } catch (e) {
            return false;
          }
        },
        "variables": function (parent) {
          const engine = smart.dark.engine;
          /*  */
          try {
            const rules = parent.cssRules || parent.rules;
            if (!rules || !rules.length) return;
            for (let i = 0; i < rules.length; i++) {
              const rule = rules[i];
              /*  */
              if (rule.style) {
                for (let j = 0; j < rule.style.length; j++) {
                  const name = rule.style[j];
                  if (name.indexOf("--") !== 0) continue;
                  const value = rule.style.getPropertyValue(name);
                  const previous = engine.color.variables.has(name) ? engine.color.variables.get(name) : undefined;
                  engine.color.variables.set(name, value);
                  if (previous !== value) engine.color.varversion++;
                }
              }
              /*  */
              if (rule.cssRules && rule.cssRules.length) engine.walk.variables(rule);
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "declarations": function (style, selector) {
          const output = [];
          const engine = smart.dark.engine;
          /*  */
          if (!style) return '';
          /*  */
          try {
            const items = [];
            /*  */
            for (let i = 0; i < style.length; i++) items.push(style[i]);
            for (const name of items) {
              if (name.indexOf("--") === 0) continue;
              if (!engine.walk.concerns(name)) continue;
              const value = style.getPropertyValue(name);
              if (!value) continue;
              const kind = engine.walk.kinds(name, selector);
              const converted = engine.color.convert(value, kind);
              if (!converted || converted === value) continue;
              output.push(name + ":" + converted + " !important");
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
          /*  */
          return output.join(";");
        },
        "custom": function (style, selector) {
          const output = [];
          const engine = smart.dark.engine;
          /*  */
          if (!style) return '';
          /*  */
          try {
            const items = [];
            /*  */
            for (let i = 0; i < style.length; i++) items.push(style[i]);
            for (const name of items) {
              if (name.indexOf("--") !== 0) continue;
              const value = style.getPropertyValue(name).trim();
              if (!value || !engine.color.match(engine.color.resolve(value)).length) continue;
              const kind = engine.walk.variableKind(name);
              const converted = engine.color.convert(value, kind);
              if (!converted || converted === value) continue;
              output.push(name + ":" + converted + " !important");
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
          /*  */
          return output.join(";");
        },
        "rule": function (rule, record, group, seen) {
          const engine = smart.dark.engine;
          /*  */
          try {
            const charset = rule.cssText === undefined || rule.cssText === null;
            if (charset) return '';
            /*  */
            const selector = rule.selectorText !== undefined ? rule.selectorText : (rule.keyText !== undefined ? rule.keyText : '');
            const inner = engine.walk.declarations(rule.style, selector);
            const extra = engine.walk.custom(rule.style, selector);
            const changed = inner ? (extra ? inner + ";" + extra : inner) : extra;
            /*
              CSS nesting: a style rule can carry BOTH declarations and nested child rules - returning early above hid every nested child (converted never),
              so children keep flowing through the same recursion the grouping branch uses
            */
            if (changed) {
              const nested = rule.cssRules && rule.cssRules.length ? engine.walk.text(rule, record, (group || '') + selector + "|", seen) : '';
              return selector + "{" + changed + (nested ? nested : '') + "}";
            }
            /*  */
            if (rule.cssRules && rule.cssRules.length) {
              /*
                print-only grouped styles (e.g. @media print) are skipped wholesale
              */
              if (engine.walk.print(rule.conditionText)) return '';
              const opener = rule.cssText.indexOf("{");
              const header = opener !== -1 ? rule.cssText.slice(0, opener) : '';
              return header + "{" + engine.walk.text(rule, record, (group || '') + header + "|", seen) + "}";
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
          /*  */
          return '';
        },
        "reset": function () {
          const engine = smart.dark.engine;
          /*  */
          try {
            for (const record of engine.attach.all) {
              record.rules.clear();
              record.last = '';
              record.key = '';
              record.count = -1;
              record.vars = false;
              record.dirty = true;
              record.empty = false;
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "text": function (parent, record, group, seen) {
          let text = "";
          const engine = smart.dark.engine;
          /*  */
          try {
            const rules = parent.cssRules || parent.rules;
            if (!rules || !rules.length) return '';
            const cache = record && record.rules ? record.rules : null;
            const prefix = group || '';
            const tracked = seen || (cache ? new Set() : null);
            const nested = prefix !== '';
            /*  */
            for (let i = 0; i < rules.length; i++) {
              const rule = rules[i];
              if (!rule) continue;
              const source = rule.cssText === undefined || rule.cssText === null ? '' : rule.cssText;
              const key = prefix + i + "|" + source;
              /*  */
              if (cache) {
                const cached = cache.get(key);
                if (cached !== undefined) {
                  text += cached;
                  if (tracked) tracked.add(key);
                  continue;
                }
                /*  */
                const output = engine.walk.rule(rule, record, prefix, tracked);
                if (cache.size > 8000) cache.clear();
                cache.set(key, output);
                if (tracked) tracked.add(key);
                text += output;
                continue;
              }
              /*  */
              text += engine.walk.rule(rule);
            }
            /*  */
            if (cache && tracked && !nested) {
              for (const key of [...cache.keys()]) {
                if (!tracked.has(key)) cache.delete(key);
              }
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return '';
          }
          /*  */
          return text;
        }
      },
      "attach": {
        "all": new Set(),
        "marks": new WeakMap(),
        "record": function (sheet) {
          const attach = smart.dark.engine.attach;
          /*  */
          try {
            let record = attach.marks.get(sheet);
            if (record) return record;
            /*  */
            record = {
              "key": '',
              "media": '',
              "last": '',
              "count": -1,
              "vars": false,
              "dirty": false,
              "empty": false,
              "sheet": sheet,
              "pushed": false,
              "wrapper": null,
              "rules": new Map()
            };
            /*  */
            attach.marks.set(sheet, record);
            attach.all.add(record);
            return record;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return null;
          }
        },
        "key": function (sheet) {
          try {
            const rules = sheet.cssRules;
            if (!rules || !rules.length) return "0";
            /*  */
            const first = rules[0];
            const last = rules[rules.length - 1];
            const b = last.cssText === undefined ? 0 : (last.cssText || '').length;
            const a = first.cssText === undefined ? 0 : (first.cssText || '').length;
            /*  */
            return rules.length + "|" + a + "|" + b;
          } catch (e) {
            return "cors";
          }
        },
        "shell": function () {
          const state = smart.dark.state;
          const engine = smart.dark.engine;
          /*  */
          try {
            if (state.darkpage || state.shell) return;
            const theme = smart.dark.theme;
            const text = ":root { color-scheme: dark; }\nhtml { background-color: " + theme.background + "; color: " + theme.text + "; }";
            const wrapper = engine.attach.document(text, '', null);
            if (wrapper) {
              state.shell = wrapper;
              engine.list.sheets.push({
                "record": null,
                "wrapper": wrapper,
                "level": "document"
              });
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "document": function (text, media, wrapper) {
          const state = smart.dark.state;
          /*  */
          try {
            if (!text) return null;
            if (wrapper) {
              wrapper.replaceSync(text);
              if (media && wrapper.media && wrapper.media.mediaText !== undefined) {
                wrapper.media.mediaText = media;
              }
              /*  */
              return wrapper;
            }
            /*  */
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(text);
            if (media && sheet.media && sheet.media.mediaText !== undefined) {
              sheet.media.mediaText = media;
            }
            /*  */
            sheet[smart.dark.object.cssstylesheet] = true;
            /*  */
            if (state.batching) {
              state.pending.push(sheet);
            } else {
              document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
            }
            /*  */
            return sheet;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return null;
          }
        },
        "shadow": function (root, text, media, wrapper) {
          const state = smart.dark.state;
          /*  */
          try {
            if (!root || !text) return null;
            if (wrapper) {
              wrapper.replaceSync(text);
              if (media && wrapper.media && wrapper.media.mediaText !== undefined) {
                wrapper.media.mediaText = media;
              }
              /*  */
              return wrapper;
            }
            /*  */
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(text);
            if (media && sheet.media && sheet.media.mediaText !== undefined) {
              sheet.media.mediaText = media;
            }
            /*  */
            sheet[smart.dark.object.cssstylesheet] = true;
            const current = [...root.adoptedStyleSheets];
            /*  */
            if (current.indexOf(sheet) !== -1) return sheet;
            if (state.batching) {
              state.pendingroot.push({"root": root, "sheet": sheet});
            } else {
              root.adoptedStyleSheets = [...current, sheet];
            }
            /*  */
            return sheet;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            return null;
          }
        },
        "commit": function () {
          try {
            const state = smart.dark.state;
            if (!document.adoptedStyleSheets) return;
            /*  */
            if (state.pending.length) {
              const current = [...document.adoptedStyleSheets];
              for (const wrapper of state.pending) {
                if (current.indexOf(wrapper) === -1) current.push(wrapper);
              }
              /*  */
              document.adoptedStyleSheets = current;
              state.pending = [];
            }
            /*  */
            if (state.pendingroot.length) {
              for (const item of state.pendingroot) {
                try {
                  const current = [...item.root.adoptedStyleSheets];
                  if (current.indexOf(item.sheet) === -1) item.root.adoptedStyleSheets = [...current, item.sheet];
                } catch (e) {
                  if (config.log) {
                    console.error(e);
                  }
                }
              }
              /*  */
              state.pendingroot = [];
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "remote": async function (sheet, root) {
          const state = smart.dark.state;
          const engine = smart.dark.engine;
          /*  */
          try {
            const href = sheet ? (sheet.href || '') : '';
            const media = sheet.media && sheet.media.mediaText ? sheet.media.mediaText : '';
            if (!href) return;
            /*  */
            if (state.fetching[href]) {
              const entry = state.fetching[href];
              const target = {"root": root || null, "media": media};
              const exists = entry.targets.some(function (item) { return item.root === target.root && item.media === target.media; });
              /*
                the late consumer is registered FIRST (a 15s old cooldown must not leave a fresh root waiting forever)
                - the cooldown only throttles repeat fetches for targets the entry already carries
              */
              if (!exists) entry.targets.push(target);
              if (exists && entry.applied && Date.now() - entry.applied < 15000) return;
              /*
                fresh target (or stale generation) → refetch once; the reply applies to every carried target
              */
              if (entry.generation !== state.generation || !exists) {
                entry.generation = state.generation;
                entry.sent = Date.now();
                background.send("fetch", {"href": href, "index": 0});
              }
              /*  */
              return;
            }
            /*  */
            state.fetching[href] = {"generation": state.generation, "targets": [{"root": root || null, "media": media}], "sent": Date.now()};
            /*  */
            try {
              if (config.log) console.error("smart fetch direct: " + href);
              const response = await fetch(href, {"cache": "default"});
              if (response && response.ok) {
                const type = (response.headers.get("content-type") || '').toLowerCase();
                if (type.indexOf("text/css") !== -1) {
                  const cloned = response.clone();
                  let content = await response.text();
                  if (content.includes("\x00")) {
                    const decoder = new TextDecoder("utf-16");
                    const buffer = await cloned.arrayBuffer();
                    content = buffer ? decoder.decode(buffer) : content;
                  }
                  /*
                    empty CSS bodies still reply (smart.content stamps applied and returns) — falling through would double-fetch via background
                  */
                  smart.content({"href": href, "index": 0, "content": content});
                  return;
                }
              }
              /*  */
              throw new Error("Not CSS");
            } catch (ex) {
              if (config.log) console.error("smart fetch fallback: " + href + " (" + (ex && ex.message ? ex.message : '') + ")");
            }
            /*  */
            background.send("fetch", {"href": href, "index": 0});
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "sweep": function (scope) {
          const engine = smart.dark.engine;
          /*  */
          try {
            if (!scope || !scope.querySelectorAll) return;
            const classes = scope.querySelectorAll("[class*='smart-dark-correction']");
            for (let i = 0; i < classes.length; i++) {
              try {
                const tokens = (classes[i].getAttribute("class") || "").split(/\s+/);
                const kept = tokens.filter(function (token) { return token.indexOf("smart-dark-correction") !== 0; });
                if (kept.length !== tokens.length) classes[i].setAttribute("class", kept.join(" ").trim());
              } catch (ex) {
                if (config.log) {
                  console.error(ex);
                }
              }
            }
            /*  */
            for (const name in engine.inline.props) {
              const entry = engine.inline.props[name];
              const marked = scope.querySelectorAll("[" + entry.attr + "]");
              for (let i = 0; i < marked.length; i++) {
                try {
                  marked[i].removeAttribute(entry.attr);
                  if (marked[i].style) marked[i].style.removeProperty(entry.var);
                } catch (ex) {
                  if (config.log) {
                    console.error(ex);
                  }
                }
              }
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "leave": function (roots) {
          const extra = [];
          const state = smart.dark.state;
          const engine = smart.dark.engine;
          /*  */
          for (const item of engine.inline.sheets || []) extra.push(item.sheet);
          for (const item of state.computed.sheets || []) extra.push(item.sheet);
          /*  */
          const detach = function (target) {
            try {
              if (!target || !target.adoptedStyleSheets) return;
              const current = [...target.adoptedStyleSheets];
              const next = current.filter(function (wrapper) {
                if (wrapper[smart.dark.object.cssstylesheet] === true) return false;
                return extra.indexOf(wrapper) === -1;
              });
              if (next.length !== current.length) target.adoptedStyleSheets = next;
            } catch (e) {
              if (config.log) {
                console.error(e);
              }
            }
          };
          /*  */
          detach(document);
          /*
            shadow.stop() empties shadow.roots before this runs — stop() passes a snapshot taken earlier
          */
          for (const item of roots || engine.shadow.roots || []) detach(item.root);
          /*  */
          state.shell = null;
          engine.list.sheets = [];
          engine.inline.sheets = [];
          state.computed.items = [];
          state.computed.sheets = [];
          state.computed.sequence = 0;
          state.computed.nodes = new WeakMap();
        }
      },
      "analyze": {
        "document": function () {
          const engine = smart.dark.engine;
          /*  */
          try {
            engine.analyze.touched = false;
            const sheets = document.styleSheets || [];
            /*  */
            for (let i = 0; i < sheets.length; i++) {
              const sheet = sheets[i];
              if (!sheet) continue;
              if (sheet.ownerNode && sheet.ownerNode.id && String(sheet.ownerNode.id).indexOf("dark-mode-") === 0) continue;
              const record = engine.attach.record(sheet);
              if (!record) continue;
              /*  */
              let count = 0;
              let readable = true;
              try { count = sheet.cssRules ? sheet.cssRules.length : 0; } catch (ex) { readable = false; count = 0; }
              /*
                CORS-blocked: never walk again; defer to the remote fetch path (a record stays for the href)
              */
              if (!readable) {
                if (sheet.href && record.wrapper === null) engine.attach.remote(sheet);
                continue;
              }
              /*  */
              const key = engine.attach.key(sheet);
              if (record.wrapper !== null && record.count === count && record.key === key && record.dirty === false) continue;
              if (record.wrapper === null && record.empty === true && record.count === count && record.key === key && record.dirty === false) continue;
              /*  */
              const fresh = record.vars === false || record.dirty === true;
              if (fresh) {
                try { engine.walk.variables(sheet); } catch (ex) { if (config.log) console.error(ex); }
              }
              /*  */
              record.key = key;
              record.vars = true;
              record.dirty = false;
              record.empty = false;
              record.count = count;
              /*
                print-only sheets keep empty bookkeeping so later passes short-circuit
              */
              if (engine.walk.print(sheet.media && sheet.media.mediaText)) {
                record.empty = true;
                continue;
              }
              /*  */
              const text = engine.walk.text(sheet, record);
              const media = sheet.media && sheet.media.mediaText ? sheet.media.mediaText : '';
              /*  */
              if (text) {
                /*
                  change-based stamping: identical re-walks (CSSOM churn on non-color rules) must not relabel touched —
                  the full idle sweep (flush branch) would otherwise run on every mutation flush instead of staying rare
                */
                if (text !== record.last) {
                  engine.analyze.touched = true;
                  record.last = text;
                }
                record.wrapper = engine.attach.document(text, media, record.wrapper);
                if (record.wrapper && record.pushed !== true) {
                  record.pushed = true;
                  engine.list.sheets.push({"wrapper": record.wrapper, "level": "document", "record": record});
                }
              } else if (record.wrapper) {
                /*
                  keep the last converted text: a transient empty walk (sheet swapped/unreadable) must never blank our wrapper
                */
                smart.dark.say("kept last text for " + (sheet.href || "inline sheet"));
              } else if (sheet.href) {
                engine.attach.remote(sheet);
              } else {
                record.empty = true;
              }
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "shadow": function () {
          const engine = smart.dark.engine;
          /*  */
          try {
            engine.shadow.discover();
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "theme": function () {
          const engine = smart.dark.engine;
          /*  */
          try {
            if (!document.head) return;
            if (document.querySelector('meta[data-smart-dark-theme="1"]')) return;
            /*  */
            const meta = document.createElement("meta");
            meta.setAttribute("name", "theme-color");
            meta.setAttribute("content", smart.dark.theme.background);
            meta.setAttribute("data-smart-dark-theme", "1");
            /*  */
            document.head.appendChild(meta);
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "light": function () {
          const engine = smart.dark.engine;
          try {
            /*
              the dark cover paints body itself; while it is on, the page's own background is unreadable from computed styles
            */
            if (document.documentElement && document.documentElement.hasAttribute(config.temporarily.id.start)) {
              smart.dark.say("light check skipped (cover on): assuming light");
              return true;
            }
            /*  */
            const targets = [document.body, document.documentElement];
            /*  */
            for (const target of targets) {
              if (!target) continue;
              const computed = window.getComputedStyle(target);
              const background = computed ? computed.backgroundColor : '';
              if (!background || background === "transparent") continue;
              const tiny = tinycolor ? tinycolor(background) : null;
              if (!tiny || !tiny.isValid || !tiny.isValid() || !tiny.getLuminance || tiny.getAlpha() === 0) continue;
              return tiny.getLuminance() > 0.35;
            }
            /*  */
            return true;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            return true;
          }
        },
        "fixed": function () {
          const state = smart.dark.state;
          const engine = smart.dark.engine;
          /*  */
          try {
            const theme = smart.dark.theme;
            const roots = state.darkpage ? "html {color-scheme: dark !important;}" : "html {color-scheme: dark !important;} html, body {background-color: " + theme.background + " !important; color: " + theme.text + " !important;}";
            /* 
              no blanket anchor paint: site-declared link colors convert in walk, undeclared links inherit the light body text (site theme decides, per-context colors preserved)
            */
            const placeholder = "input::placeholder, textarea::placeholder {color: " + theme.muted + " !important;}";
            const selection = "::selection {background-color: " + theme.selection + " !important; color: " + theme.text + " !important;}";
            const controls = "input, textarea, select, button, option, [role=combobox], [role=listbox], [role=option], [role=menu], [role=menuitem] {color: " + theme.text + " !important;}";
            const scrollbar = "html {scrollbar-color: " + theme.border + " " + theme.background + " !important;} html::-webkit-scrollbar, *::-webkit-scrollbar {background-color: " + theme.background + " !important;} html::-webkit-scrollbar-thumb, *::-webkit-scrollbar-thumb {background-color: " + theme.border + " !important;}";
            const autofill = "input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, textarea:-webkit-autofill, select:-webkit-autofill {box-shadow: 0 0 0 40px " + theme.background + " inset !important; -webkit-text-fill-color: " + theme.text + " !important; background-color: " + theme.control + " !important;}";
            /* 
              frame slots: unloaded/transparent embed bodies paint the dark background instead of pre-paint white; iframe content darkens via its own engine instance (all_frames)
            */
            const frames = "iframe {background-color: " + theme.background + " !important;}";
            const overrides = state.darkpage ? "" : controls + placeholder + selection + autofill + frames;
            /*
              decoupled from the native advanced darken/variables options - smart engine keeps its own defaults (image gate on, photo dim 0.85)
            */
            const brightness = engine.option.values.veilbrightness;
            const imagegate = engine.option.values.imagegate === true;
            const images = imagegate && state.darkpage === false ? " img, image {filter: brightness(" + brightness + ") !important;}" : '';
            /*  */
            smart.dark.say("fixed rebuild (darkpage=" + state.darkpage + ")");
            state.fixed = engine.attach.document(roots + overrides + scrollbar + images, '', state.fixed);
            /*  */
            return state.fixed;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return null;
          }
        }
      },
      "inline": {
        "sheets": [],
        "cache": new WeakMap(),
        "props": {
          "fill": {"var": "--smart-dark-inline-fill", "attr": "data-smart-dark-inline-fill", "kind": "text"},
          "color": {"var": "--smart-dark-inline-color", "attr": "data-smart-dark-inline-color", "kind": "text"},
          "background": {"var": "--smart-dark-inline-bg", "attr": "data-smart-dark-inline-bg", "kind": "surface"},
          "stroke": {"var": "--smart-dark-inline-stroke", "attr": "data-smart-dark-inline-stroke", "kind": "text"},
          "stop-color": {"var": "--smart-dark-inline-stop", "attr": "data-smart-dark-inline-stop", "kind": "accent"},
          "border-color": {"var": "--smart-dark-inline-border", "attr": "data-smart-dark-inline-border", "kind": "border"},
          "outline-color": {"var": "--smart-dark-inline-outline", "attr": "data-smart-dark-inline-outline", "kind": "border"},
          "box-shadow": {"var": "--smart-dark-inline-boxshadow", "attr": "data-smart-dark-inline-boxshadow", "kind": "shadow"},
          "background-color": {"var": "--smart-dark-inline-bgcolor", "attr": "data-smart-dark-inline-bgcolor", "kind": "surface"},
          "background-image": {"var": "--smart-dark-inline-bgimage", "attr": "data-smart-dark-inline-bgimage", "kind": "surface"},
          "text-shadow": {"var": "--smart-dark-inline-textshadow", "attr": "data-smart-dark-inline-textshadow", "kind": "text-shadow"}
        },
        "text": function (target) {
          const inline = smart.dark.engine.inline;
          /*  */
          try {
            /*
              shadow roots adopt their own sheet - the document-level html[theme] ancestor can never match inside a shadow tree,
              so the bridge selectors stay bare there (mirror of deep.selector)
            */
            const scope = target && target.nodeType === 11 ? '' : "html[" + smart.dark.attribute.theme + "] ";
            const rules = [];
            for (const name in inline.props) {
              const entry = inline.props[name];
              rules.push(scope + "[" + entry.attr + "] {" + name + ": var(" + entry.var + ") !important;}");
            }
            /*  */
            return rules.join("\n");
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return '';
          }
        },
        "attach": function (root) {
          const inline = smart.dark.engine.inline;
          const target = root && root.nodeType === 11 ? root : document;
          /*  */
          try {
            for (const item of inline.sheets) {
              if (item.root === target) return item.sheet;
            }
            /*  */
            if (!target.adoptedStyleSheets) return null;
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(inline.text(target));
            target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
            inline.sheets.push({"root": target, "sheet": sheet});
            /*  */
            return sheet;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return null;
          }
        },
        "element": function (node) {
          const engine = smart.dark.engine;
          const state = smart.dark.state;
          const inline = engine.inline;
          /*  */
          try {
            const style = node.style;
            if (!style || !node) return;
            /*  */
            const key = node.getAttribute ? (node.getAttribute("style") || '') : '';
            const cached = inline.cache.get(node);
            if (cached && cached.key === key && cached.generation === state.generation) return;
            /*  */
            const items = [];
            const applied = {};
            /*  */
            for (let i = 0; i < style.length; i++) items.push(style[i]);
            /*  */
            for (const name of items) {
              const value = style.getPropertyValue(name);
              if (!value) continue;
              if (name.indexOf("--") === 0) {
                const root = node === document.documentElement || node === document.body;
                if (root) engine.color.variables.set(name, value);
                if (engine.color.match(engine.color.resolve(value)).length) {
                  const variable = engine.color.convert(value, engine.walk.variableKind(name));
                  if (variable && variable !== value) engine.deep.set(node, name, variable, style.getPropertyPriority(name));
                }
                /*  */
                continue;
              }
              /*  */
              const entry = inline.props[name];
              if (!entry) continue;
              if (!engine.walk.concerns(name)) continue;
              const converted = engine.color.convert(value, engine.walk.kinds(name, node.tagName || ''));
              if (!converted || converted === value) continue;
              applied[name] = {"name": name, "var": entry.var, "attr": entry.attr, "value": converted};
            }
            /*  */
            let writes = 0;
            for (const name in applied) writes++;
            if (cached) {
              for (const previous of cached.props) {
                if (applied[previous.name]) continue;
                writes++;
              }
            }
            /*  */
            if (writes) state.internal.set(node, writes);
            for (const name in applied) {
              const item = applied[name];
              node.style.setProperty(item.var, item.value);
              node.setAttribute(item.attr, '');
            }
            /*  */
            if (cached) {
              for (const previous of cached.props) {
                if (applied[previous.name]) continue;
                node.style.removeProperty(previous.var);
                if (node.getAttribute(previous.attr) !== null) node.removeAttribute(previous.attr);
              }
            }
            /*  */
            const props = [];
            for (const name in applied) props.push(applied[name]);
            inline.cache.set(node, {"key": key, "generation": state.generation, "props": props});
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "svg": function (node) {
          const engine = smart.dark.engine;
          const state = smart.dark.state;
          const inline = engine.inline;
          /*  */
          try {
            if (!node || !node.getAttribute) return;
            /*  */
            const names = ["fill", "stroke", "stop-color"];
            const key = names.map(function (name) { return node.getAttribute(name) || ''; }).join("|");
            const cached = inline.cache.get(node);
            if (cached && cached.svg === key && cached.generation === state.generation) return;
            /*  */
            const applied = [];
            for (const name of names) {
              const value = node.getAttribute(name);
              if (!value) continue;
              if (!engine.color.match(engine.color.resolve(value)).length) continue;
              const entry = inline.props[name];
              if (!entry) continue;
              const converted = engine.color.convert(value, entry.kind);
              if (!converted || converted === value) continue;
              node.style.setProperty(name, converted);
              node.setAttribute(entry.attr, '');
              applied.push({"name": name, "var": entry.var, "attr": entry.attr});
            }
            /*  */
            if (cached) {
              for (const previous of cached.svgprops || []) {
                const current = applied.some(function (item) { return item.name === previous.name; });
                if (current) continue;
                node.style.removeProperty(previous.var);
                if (node.getAttribute(previous.attr) !== null) node.removeAttribute(previous.attr);
              }
            }
            /*  */
            inline.cache.set(node, {"key": cached ? cached.key : '', "generation": state.generation, "props": cached ? cached.props : [], "svg": key, "svgprops": applied});
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "sweep": function (root) {
          const engine = smart.dark.engine;
          /*  */
          try {
            const source = root || document.documentElement;
            /*  */
            if (!source || !source.querySelectorAll) return;
            if (source.nodeType === 11) engine.inline.attach(source);
            else if (source === document.documentElement || source === document.body || source === document) engine.inline.attach(document);
            /*  */
            const nodes = source.querySelectorAll("[style]");
            for (let i = 0; i < nodes.length; i++) {
              engine.inline.element(nodes[i]);
            }
            /*  */
            const icons = source.querySelectorAll("[fill], [stroke], [stop-color]");
            for (let i = 0; i < icons.length; i++) {
              if (!icons[i].ownerSVGElement && !/^svg$/i.test(icons[i].tagName)) continue;
              engine.inline.svg(icons[i]);
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        }
      },
      "deep": {
        "images": new WeakMap(),
        "veiled": new WeakSet(),
        "svgt": function (value) {
          const deep = smart.dark.engine.deep;
          const engine = smart.dark.engine;
          /*  */
          try {
            /*
              plain-text svg data uris only (base64 is not cheaply rewritable here) — fill/stroke/stop-color attributes go through the normal conversion
            */
            const source = String(value || '');
            if (source.toLowerCase().indexOf("base64") !== -1) return '';
            const start = source.indexOf("<svg");
            if (start === -1) return '';
            const end = source.lastIndexOf(">") + 1;
            if (end <= start) return '';
            const body = source.slice(start, end);
            if (body.length > 20000) return '';
            const regex = /\b(fill|stroke|stop-color)=(["'])([^"']*)\2/g;
            let found = false;
            const changed = body.replace(regex, function (match, name, quote, attr) {
              if (!attr || attr === "none" || attr === "inherit" || attr.indexOf("url(") !== -1) return match;
              if (!engine.color.match(engine.color.resolve(attr)).length) return match;
              const converted = engine.color.convert(attr, name === "stop-color" ? "accent" : "text");
              if (!converted || converted === attr) return match;
              found = true;
              return name + "=" + quote + converted + quote;
            });
            if (!found) return '';
            return source.slice(0, start) + changed + source.slice(end);
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return '';
          }
        },
        "image": function (node, computed, image) {
          const deep = smart.dark.engine.deep;
          /*  */
          try {
            if (smart.dark.state.darkpage) return;
            /*
              photo-like CSS backgrounds get a dark veil + the original image (carpet/icon-size graphics stay untouched)
            */
            const value = String(image || '');
            if (value.indexOf("url(") === -1) return;
            const blend = computed.getPropertyValue("background-blend-mode");
            if (blend && blend !== "normal") return;
            /*
              svg data uris are recolored glyphs (identical value = icon swap), anything larger is a veiled photo — icons skip the size floor entirely
            */
            if (value.indexOf("data:image/svg") !== -1) {
              const recolored = deep.svgt(value);
              if (recolored && recolored !== value) {
                const key = "|svg|" + value;
                const existed = deep.images.get(node);
                if (existed !== key) {
                  deep.images.set(node, key);
                  if (deep.set(node, "background-image", recolored, "important")) smart.dark.say("svg data uri: recolored");
                }
              }
              /*  */
              return;
            }
            /*  */
            const rect = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
            if (!rect || rect.width < 120 || rect.height < 120) return;
            /*
              already-veiled guard: once a node carries the veil we never stack another layer
              (cache key includes the box size, so resize/re-layout or a cache clear would otherwise prepend a second raw veil)
            */
            if (deep.veiled.has(node)) return;
            const key = value + "|" + Math.round(rect.width) + "x" + Math.round(rect.height);
            const previous = deep.images.get(node);
            if (previous === key) return;
            /*  */
            deep.images.set(node, key);
            const veil = smart.dark.theme.imageveil;
            const overlay = "linear-gradient(" + veil + ", " + veil + ")";
            const combined = overlay + ", " + value;
            /*  */
            if (deep.set(node, "background-image", combined, "important")) {
              deep.veiled.add(node);
              smart.dark.say("image veil: " + Math.round(rect.width) + "x" + Math.round(rect.height) + " node");
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "sheet": function (root) {
          const state = smart.dark.state;
          const target = root && root.nodeType === 11 ? root : document;
          /*  */
          try {
            for (const item of state.computed.sheets) {
              if (item.root === target) return item.sheet;
            }
            /*  */
            if (!target.adoptedStyleSheets) return null;
            const sheet = new CSSStyleSheet();
            target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
            state.computed.sheets.push({"root": target, "sheet": sheet});
            /*  */
            return sheet;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return null;
          }
        },
        "selector": function (node, token, root) {
          const scope = root && root.nodeType === 11 ? '' : 'html[smart-dark-active] ';
          /*  */
          try {
            if (node.id) {
              const id = window.CSS && window.CSS.escape ? window.CSS.escape(node.id) : node.id.replace(/([\\.#:[\],>+~*])/g, "\\$1");
              return scope + "#" + id;
            }
            /*  */
            let parent = node.parentElement;
            while (parent && parent !== document.documentElement) {
              if (parent.id) {
                const id = window.CSS && window.CSS.escape ? window.CSS.escape(parent.id) : parent.id.replace(/([\\.#:[\],>+~*])/g, "\\$1");
                return scope + "#" + id + " ." + token;
              }
              /*  */
              parent = parent.parentElement;
            }
            /*  */
            return scope + "." + token;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return "." + token;
          }
        },
        "set": function (node, name, value, priority) {
          const state = smart.dark.state;
          const engine = smart.dark.engine;
          /*  */
          try {
            if (!node || !node.classList || !name || !value) return false;
            const root = node.getRootNode ? node.getRootNode() : document;
            const sheet = engine.deep.sheet(root);
            /*  */
            if (!sheet) return false;
            let item = state.computed.nodes.get(node);
            if (!item) {
              const token = node.id ? '' : "smart-dark-correction-" + (state.computed.sequence++).toString(36);
              const selector = engine.deep.selector(node, token, root);
              const index = sheet.insertRule(selector + " {}", sheet.cssRules.length);
              item = {"node": node, "token": token, "sheet": sheet, "rule": sheet.cssRules[index]};
              state.computed.nodes.set(node, item);
              state.computed.items.push(item);
              if (token) node.classList.add(token);
            }
            /*  */
            if (item.token && !node.classList.contains(item.token)) node.classList.add(item.token);
            item.rule.style.setProperty(name, value, priority || "");
            return true;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
            /*  */
            return false;
          }
        },
        "node": function (node) {
          const engine = smart.dark.engine;
          /*  */
          try {
            /*
              media frames (video/canvas/embeds) are painted content, not CSS — conversions cannot reach inside, patches would only fog the slot
            */
            if (!node || !node.style || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|VIDEO|CANVAS|IFRAME|OBJECT|EMBED)$/.test(node.tagName)) return;
            const computed = window.getComputedStyle(node);
            if (!computed || computed.display === "none" || computed.visibility === "hidden") return;
            const tag = String(node.tagName || '').toLowerCase();
            const role = node.getAttribute ? String(node.getAttribute("role") || '').toLowerCase() : '';
            const control = /^(button|input|select|textarea|option)$/.test(tag) || /^(combobox|listbox|option|menu|menuitem)$/.test(role);
            let direct = false;
            /*  */
            const children = node.childNodes || [];
            for (let i = 0; i < children.length; i++) {
              if (children[i].nodeType === 3 && children[i].textContent && children[i].textContent.trim()) {
                direct = true;
                break;
              }
            }
            /*  */
            if (control || direct) {
              const foreground = tinycolor(computed.color);
              if (foreground && foreground.isValid && foreground.isValid() && (control || foreground.getLuminance() < 0.52)) {
                const converted = engine.color.convert(computed.color, "text");
                if (converted && converted !== computed.color) engine.deep.set(node, "color", converted, "important");
              }
              /*  */
              const fillValue = computed.getPropertyValue("-webkit-text-fill-color");
              const fill = tinycolor(fillValue);
              if (fillValue && fill && fill.isValid && fill.isValid() && fill.getAlpha() > 0 && fill.getLuminance() < 0.52) {
                const converted = engine.color.convert(fillValue, "text");
                if (converted && converted !== fillValue) engine.deep.set(node, "-webkit-text-fill-color", converted, "important");
              }
            }
            /*  */
            if (!direct && !control) {
              const before = window.getComputedStyle(node, "::before");
              const after = window.getComputedStyle(node, "::after");
              for (const pseudo of [before, after]) {
                const content = pseudo ? pseudo.getPropertyValue("content") : "";
                const pseudoColor = pseudo ? tinycolor(pseudo.color) : null;
                if (!content || content === "none" || content === "normal" || !pseudoColor || !pseudoColor.isValid || !pseudoColor.isValid() || pseudoColor.getAlpha() === 0 || pseudoColor.getLuminance() >= 0.52) continue;
                const converted = engine.color.convert(pseudo.color, "text");
                if (converted && converted !== pseudo.color) engine.deep.set(node, "color", converted, "important");
                break;
              }
            }
            /*  */
            const background = tinycolor(computed.backgroundColor);
            const kind = control ? "control" : (node === document.documentElement || node === document.body ? "background" : "surface");
            if (background && background.isValid && background.isValid() && background.getAlpha() > 0 && background.getLuminance() > 0.55) {
              const converted = engine.color.convert(computed.backgroundColor, kind);
              if (converted && converted !== computed.backgroundColor) engine.deep.set(node, "background-color", converted, "important");
            }
            /*  */
            const image = computed.backgroundImage;
            if (image && image !== "none") {
              const converted = engine.color.convert(image, kind);
              if (converted && converted !== image) engine.deep.set(node, "background-image", converted, "important");
              /* url()-only image (no converted color tokens): photo veil, not a blanket brightness patch */
              else if (converted === image && !direct && !control) engine.deep.image(node, computed, image);
            }
            /*  */
            const borders = ["borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outlineColor"];
            for (const name of borders) {
              const property = name.replace(/[A-Z]/g, function (letter) { return "-" + letter.toLowerCase(); });
              const border = tinycolor(computed.getPropertyValue(property));
              const borderstyle = name === "outlineColor" ? computed.outlineStyle : computed.getPropertyValue(property.replace("color", "style"));
              if (!borderstyle || borderstyle === "none" || !border || !border.isValid || !border.isValid() || border.getAlpha() === 0 || border.getLuminance() >= 0.38) continue;
              const converted = border.getLuminance() < 0.18 ? smart.dark.theme.border : engine.color.convert(computed.getPropertyValue(property), "border");
              if (converted && converted !== computed.getPropertyValue(property)) engine.deep.set(node, property, converted, "important");
            }
            /*  */
            if (/^(svg|path|circle|ellipse|line|polygon|polyline|rect|use|g)$/.test(tag)) {
              for (const property of ["fill", "stroke"]) {
                const value = computed.getPropertyValue(property);
                const icon = tinycolor(value);
                if (!value || value === "none" || !icon || !icon.isValid || !icon.isValid() || icon.getAlpha() === 0 || icon.getLuminance() >= 0.42) continue;
                const converted = engine.color.convert(value, icon.toHsl().s < 0.12 ? "text" : "accent");
                if (converted && converted !== value) engine.deep.set(node, property, converted, "important");
              }
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "computed": function (root) {
          const state = smart.dark.state;
          const engine = smart.dark.engine;
          /*  */
          try {
            /*
              gentle leak prune: correction bookkeeping holds nodes strongly
              - a full pass drops entries for nodes the page already removed (a stray dead rule in the sheet is harmless)
              keep the prune ABOVE the deep-option gate: with deep off the items array must still drain
            */
            for (let i = state.computed.items.length - 1; i >= 0; i--) {
              const item = state.computed.items[i];
              if (!item || !item.node || item.node.isConnected === false) state.computed.items.splice(i, 1);
            }
            /*  */
            if (engine.option.values.deep !== true) return;
            /*  */
            const nodes = [];
            if (root && root.nodeType === 1) nodes.push(root);
            const descendants = (root || document).querySelectorAll("*");
            for (let i = 0; i < descendants.length; i++) nodes.push(descendants[i]);
            const run = state.generation;
            let index = 0;
            /*  */
            const step = function () {
              try {
                if (state.active !== true || state.generation !== run) return;
                const end = Math.min(nodes.length, index + 600);
                for (; index < end; index++) engine.deep.node(nodes[index]);
                if (index < nodes.length) window.requestAnimationFrame(step);
              } catch (e) {
                if (config.log) {
                  console.error(e);
                }
              }
            };
            /*  */
            window.requestAnimationFrame(step);
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        }
      },
      "proxy": function () {
        const state = smart.dark.state;
        const engine = smart.dark.engine;
        /*  */
        try {
          /*
            decoupled from the native advanced cssstylesheet option - smart engine keeps its own cssproxy flag (default OFF: no MAIN-world patch on average pages)
          */
          if (engine.option.values.cssproxy !== true || state.proxy === true) return;
          /*  */
          state.proxy = true;
          /*  */
          const script = document.createElement("script");
          const src = chrome.runtime.getURL("data/content_script/page_context/smart.js");
          /*  */
          script.type = "text/javascript";
          script.onload = function () { script.remove(); };
          script.onerror = function () {
            script.remove();
            state.proxy = false;
          };
          /*  */
          script.src = src;
          document.documentElement.appendChild(script);
        } catch (e) {
          state.proxy = false;
          if (config.log) {
            console.error(e);
          }
        }
      },
      "refresh": function () {
        const state = smart.dark.state;
        const engine = smart.dark.engine;
        /*  */
        try {
          if (state.active !== true) return;
          if (state.darkpinned !== true && document.body) state.darkpage = engine.analyze.light() === false;
          if (!state.darkpage) engine.analyze.document();
          /*  */
          engine.inline.sweep(document.documentElement);
          engine.shadow.discover();
          engine.deep.computed(document.documentElement);
        } catch (e) {
          if (config.log) {
            console.error(e);
          }
        }
      },
      "process": async function () {
        const state = smart.dark.state;
        const engine = smart.dark.engine;
        /*  */
        let run = 0;
        /*  */
        try {
          if (!document.documentElement) {
            state.processing = false;
            state.queued = false;
            window.setTimeout(function () { engine.render(state.request); }, 0);
            return;
          }
          /*  */
          const warm = state.active === true;
          run = ++state.generation;
          /*  */
          engine.list.items = [];
          engine.list.sheets = warm ? engine.list.sheets : [];
          state.internal = new WeakMap();
          engine.color.prepare();
          /*  */
          if (warm === false) {
            engine.color.variables.clear();
            engine.attach.marks = new WeakMap();
            engine.attach.all = new Set();
            /*  */
            state.lates = 0;
            state.readies = 0;
            state.pending = [];
            state.latestamp = 0;
            state.active = true;
            state.pendingroot = [];
            engine.is.active = true;
            state.baseline = document.adoptedStyleSheets ? [...document.adoptedStyleSheets] : [];
            document.documentElement.setAttribute(smart.dark.attribute.theme, '');
          }
          /*
            darkpage is derived ONCE, before any conversion runs; our own dark output must never make the engine believe the page was already dark
          */
          if (state.darkpinned !== true) {
            state.darkpage = engine.analyze.light() === false;
            state.darkpinned = true;
            smart.dark.say("darkpage " + state.darkpage + " (pinned)");
          }
          /*  */
          engine.analyze.fixed();
          engine.analyze.theme();
          engine.proxy();
          /*  */
          const changed = await engine.option.load();
          if (state.generation !== run || state.active !== true) return;
          if (changed) {
            engine.color.retheme();
          }
          /*  */
          state.batching = true;
          /*  */
          try {
            if (!state.darkpage) engine.analyze.document();
            /*  */
            engine.analyze.shadow();
            engine.attach.shell();
          } finally {
            state.batching = false;
            engine.attach.commit();
          }
          /*  */
          engine.inline.sweep(document.documentElement);
          engine.deep.computed(document.documentElement);
          /*
            write-guard counters from the sweeps above stay alive: the mutation batch carrying our own writes must still be suppressed
          */
          engine.watch.start();
          /*  */
          if (document.readyState === "loading") engine.watch.arrive();
          /*  */
          {
            const delay = config.page.metrics.temporarily.delay !== undefined ? Number(config.page.metrics.temporarily.delay) : 200;
            const pending = Object.keys(state.fetching || {}).filter(function (href) { return !(state.fetching[href] || {}).applied; }).length;
            const committed = engine.list.sheets.length > 0 || document.styleSheets.length === 0;
            config.temporarily.is.removed = true;
            config.temporarily.remove(pending || !committed ? 2000 : delay, 8);
            /*
              cover ready-check: lift the moment the dark output is on the page and every CORS fetch is applied
            */
            state.readies = 0;
            engine.watch.reset("cover", engine.watch.ready, 100);
          }
          /*  */
          engine.watch.reset("settled", function () {
            if (state.active !== true || state.generation !== run) return;
            engine.shadow.discover();
            engine.walk.reset();
            for (const item of engine.shadow.roots) engine.shadow.scan(item);
            engine.refresh();
          }, 500);
          /*  */
          engine.watch.reset("settled-late", function () {
            if (state.active !== true) return;
            engine.shadow.discover();
            engine.walk.reset();
            for (const item of engine.shadow.roots) engine.shadow.scan(item);
            engine.refresh();
            /*  */
            state.lates = 0;
            engine.shadow.late();
          }, 1500);
        } catch (e) {
          /*
            mid-process throw before the remove block would pin the cover until the next render
          */
          config.temporarily.is.removed = true;
          config.temporarily.remove(0, 7);
          if (config.log) {
            console.error(e);
          }
        } finally {
          state.processing = false;
          /*  */
          if (state.deferred) {
            state.deferred = false;
            engine.watch.schedule();
          }
          /*  */
          if (state.queued) {
            const request = state.request;
            state.queued = false;
            engine.render(request);
          }
        }
      },
      "watch": {
        "node": null,
        "timers": {},
        "media": null,
        "frame": null,
        "queue": {
          "roots": [],
          "nodes": [],
          "styles": false
        },
        "reset": function (name, callback, delay) {
          const engine = smart.dark.engine;
          /*  */
          try {
            if (engine.watch.timers[name]) window.clearTimeout(engine.watch.timers[name]);
            engine.watch.timers[name] = window.setTimeout(callback, delay);
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "mark": function (node) {
          const engine = smart.dark.engine;
          /*  */
          try {
            if (!node || node.nodeType !== 1 || !node.sheet) return;
            const record = engine.attach.record(node.sheet);
            if (record) record.dirty = true;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "ready": function () {
          const state = smart.dark.state;
          const engine = smart.dark.engine;
          /*  */
          try {
            if (state.active !== true) return;
            const cover = document.documentElement && document.documentElement.hasAttribute(config.temporarily.id.start);
            if (!cover) return;
            /*  */
            const fetching = state.fetching || {};
            /*  */
            for (const href in fetching) {
              if (!fetching[href].applied) {
                if (state.readies < 19) {
                  state.readies++;
                  engine.watch.reset("cover", engine.watch.ready, 100);
                }
                return;
              }
            }
            /*  */
            if (engine.list.sheets.length === 0 && document.styleSheets.length) {
              if (state.readies < 19) {
                state.readies++;
                engine.watch.reset("cover", engine.watch.ready, 100);
              }
              /*  */
              return;
            }
            /*  */
            if (config.log) console.error("smart cover ready");
            config.temporarily.is.removed = true;
            config.temporarily.remove(0, 7);
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "arrive": function () {
          const state = smart.dark.state;
          const engine = smart.dark.engine;
          /*  */
          try {
            if (state.arrived === true) return;
            state.arrived = true;
            const pending = function () {
              document.removeEventListener("DOMContentLoaded", pending, false);
              window.removeEventListener("load", pending, false);
              state.arrived = false;
              if (state.active !== true) return;
              engine.refresh();
            };
            /*  */
            document.addEventListener("DOMContentLoaded", pending, false);
            window.addEventListener("load", pending, false);
          } catch (e) {
            state.arrived = false;
            if (config.log) {
              console.error(e);
            }
          }
        },
        "listener": function (mutations) {
          const state = smart.dark.state;
          const engine = smart.dark.engine;
          const watch = engine.watch;
          /*  */
          try {
            if (state.active !== true) return;
            if (state.processing) {
              state.deferred = true;
              return;
            }
            /*  */
            let additions = 0;
            for (const mutation of mutations) {
              if (mutation.type === "characterData") {
                const parent = mutation.target && mutation.target.parentNode;
                if (parent && parent.tagName === "STYLE") watch.mark(parent);
                continue;
              }
              /*  */
              if (mutation.type === "childList") {
                const added = mutation.addedNodes || [];
                additions = additions + added.length;
                for (const node of added) {
                  if (node.nodeType === 1) {
                    if (/^(STYLE|LINK)$/.test(node.tagName)) watch.mark(node);
                    /*
                      incremental processing: added elements go on the node queue, NOT the full-sweep flag (heavy pages mutation-bomb otherwise);
                      a full queue falls back to a throttled full sweep so nothing can be silently dropped
                    */
                    else if (watch.queue.nodes.indexOf(node) === -1 && watch.queue.nodes.length < 128) watch.queue.nodes.push(node);
                    else watch.queue.styles = true;
                  }
                }
                /*  */
                const root = mutation.target;
                if (added.length && root && root.nodeType === 1 && watch.queue.roots.indexOf(root) === -1 && watch.queue.roots.length < 64) {
                  watch.queue.roots.push(root);
                }
                /*  */
                continue;
              }
              /*  */
              if (mutation.type === "attributes") {
                const name = mutation.attributeName;
                if (name === "href" || name === "rel" || name === "media" || name === "disabled") {
                  watch.mark(mutation.target);
                  continue;
                }
                /*  */
                if (["style", "class", "hidden", "open", "aria-expanded", "aria-selected", "data-state", "data-theme"].indexOf(name) !== -1) {
                  if (name === "style") {
                    const writes = state.internal.get(mutation.target) || 0;
                    if (writes) {
                      if (writes > 1) state.internal.set(mutation.target, writes - 1);
                      else state.internal.delete(mutation.target);
                      continue;
                    }
                  }
                  /*  */
                  if (name === "class") {
                    const item = state.computed.nodes.get(mutation.target);
                    const previous = " " + (mutation.oldValue || "") + " ";
                    /*
                      tokenless items (deep.set stores token '' for id-bearing nodes): classList.contains('') throws per DOM spec
                      - the throw used to skip the rest of the batch + the trailing schedule
                    */
                    if (item && item.token && previous.indexOf(" " + item.token + " ") === -1 && mutation.target.classList.contains(item.token)) continue;
                  }
                  /*  */
                  const target = mutation.target;
                  if (target && target.nodeType === 1 && watch.queue.roots.indexOf(target) === -1 && watch.queue.roots.length < 64) {
                    watch.queue.roots.push(target);
                  }
                }
              }
            }
            /*  */
            if (!additions && !watch.queue.roots.length && !watch.queue.styles) return;
            /*  */
            if (additions > 1000) {
              watch.queue.roots = [];
              watch.queue.nodes = [];
              watch.queue.styles = false;
              /*  */
              watch.reset("huge", function () {
                const state = smart.dark.state;
                if (state.active !== true || state.processing) return;
                state.processing = true;
                /*  */
                try {
                  if (!state.darkpage) engine.analyze.document();
                  engine.shadow.discover();
                  engine.watch.reset("late", engine.shadow.late, 200);
                  /*
                    huge mutation burst: full DOM work is deferred to idle time so the feed can finish loading first
                  */
                  engine.watch.idle(function () {
                    if (state.active !== true || state.processing) return;
                    engine.inline.sweep(document.documentElement);
                    engine.deep.computed(document.documentElement);
                  });
                } finally {
                  state.processing = false;
                  if (state.deferred) {
                    state.deferred = false;
                    smart.dark.engine.watch.schedule();
                  }
                }
              }, 300);
              return;
            }
            /*  */
            watch.schedule();
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "idle": function (callback) {
          const state = smart.dark.state;
          const engine = smart.dark.engine;
          /*  */
          try {
            const run = function () {
              if (state.active !== true) return;
              callback();
            };
            /*  */
            if (window.requestIdleCallback) window.requestIdleCallback(run, {"timeout": 600});
            else window.setTimeout(run, 200);
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "sweep": function (nodes) {
          const engine = smart.dark.engine;
          const state = smart.dark.state;
          /*  */
          try {
            if (state.active !== true || !nodes || !nodes.length) return;
            const list = [];
            for (const node of nodes) if (node && node.nodeType === 1) list.push(node);
            /*
              late-attach rearm: custom elements whose shadowRoot shows up AFTER every scheduled late scan stay white forever (late-attached feed cards)
              - a flush-met custom host with an attached but UNregistered shadowRoot registers it directly (scan piggybacks inside register);
              a host with no shadowRoot yet arms one extra late round; per-sweep registration cap + the roots dedupe loop keep a stubborn page from spinning the loop
            */
            let registered = 0;
            let custom = false;
            for (const node of list) {
              if (String(node.tagName).indexOf("-") === -1) continue;
              if (engine.shadow.roots.some(function (item) { return item.host === node; })) continue;
              if (node.shadowRoot) {
                if (registered >= 10) continue;
                engine.shadow.register(node.shadowRoot, node);
                registered++;
                continue;
              }
              custom = true;
              break;
            }
            /*  */
            if (registered) smart.dark.say("late rearm: registered " + registered + " shadow host(s)");
            if (custom) engine.shadow.rearm();
            const run = state.generation;
            let index = 0;
            /*  */
            const step = function () {
              try {
                if (state.active !== true || state.generation !== run) return;
                const end = Math.min(list.length, index + 400);
                for (; index < end; index++) {
                  const node = list[index];
                  engine.inline.element(node);
                  engine.inline.svg(node);
                  /*
                    the mutation sweep path must honor the deep option exactly like the full pass (deep.computed gate)
                  */
                  if (engine.option.values.deep === true) engine.deep.node(node);
                }
                if (index < list.length) window.requestAnimationFrame(step);
              } catch (e) {
                if (config.log) {
                  console.error(e);
                }
              }
            };
            /*  */
            step();
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "schedule": function () {
          const watch = smart.dark.engine.watch;
          /*  */
          try {
            if (watch.frame !== null) return;
            watch.frame = window.requestAnimationFrame(function () {
              watch.frame = null;
              if (document.hidden === true) {
                smart.dark.state.hidden = true;
                return;
              }
              /*  */
              watch.reset("render", watch.flush, 150);
            });
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "flush": function () {
          const engine = smart.dark.engine;
          const state = smart.dark.state;
          const watch = engine.watch;
          /*  */
          try {
            if (state.active !== true || state.processing) return;
            if (document.hidden === true) {
              state.hidden = true;
              return;
            }
            /*  */
            const roots = watch.queue.roots;
            const nodes = watch.queue.nodes;
            const styles = watch.queue.styles;
            /*  */
            watch.queue.roots = [];
            watch.queue.nodes = [];
            state.processing = true;
            watch.queue.styles = false;
            /*  */
            try {
              const started = state.log && performance ? performance.now() : 0;
              if (!state.darkpage) engine.analyze.document();
              /*
                a sheet that actually changed output = rare full sweep (idle-deferred); otherwise sweep only the touched nodes, never the whole DOM again
              */
              if (styles || engine.analyze.touched) {
                engine.watch.idle(function () {
                  if (state.active !== true || state.processing) return;
                  engine.inline.sweep(document.documentElement);
                  engine.shadow.discover();
                  engine.deep.computed(document.documentElement);
                });
              } else if (nodes.length || roots.length) {
                const batch = nodes.concat(roots);
                engine.watch.sweep(batch);
                for (const node of nodes) engine.shadow.discover(node);
              }
              /*  */
              if (started) smart.dark.say("flush " + Math.round(performance.now() - started) + "ms (styles=" + (styles ? "full" : "no") + ", nodes=" + (nodes.length + roots.length) + ")");
            } finally {
              state.processing = false;
              if (state.deferred) {
                state.deferred = false;
                watch.schedule();
              }
            }
          } catch (e) {
            state.processing = false;
            if (config.log) {
              console.error(e);
            }
          }
        },
        "scheme": function () {
          const engine = smart.dark.engine;
          const state = smart.dark.state;
          /*  */
          try {
            if (state.active !== true) return;
            /*
              OS theme flip: sites re-derive colors from prefers-color-scheme — one bounded full re-convert keeps our wrappers from pinning a stale half
            */
            smart.dark.say("prefers-color-scheme flipped: full re-convert");
            for (const record of engine.attach.all) record.dirty = true;
            /*  */
            engine.walk.reset();
            engine.watch.queue.styles = true;
            engine.watch.schedule();
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "sheetpoll": function () {
          const engine = smart.dark.engine;
          const state = smart.dark.state;
          /*  */
          try {
            /*
              CSSOM writes (insertRule/deleteRule/adopted updates) never fire DOM events
              — a cheap count/key poll catches them (bounded: nothing walks unless a key changed)
            */
            if (state.active !== true) return;
            /*
              fetching-bookkeeping hygiene: a permanently dead href (404, never-CSS) must not hang around forever
              — the stale entry would force the 2s cover branch and pointless ready polls on every later render
            */
            const stamp = Date.now();
            for (const href in state.fetching) {
              const entry = state.fetching[href];
              if (!entry) { delete state.fetching[href]; continue; }
              /*
                only NEVER-applied entries evict (dead hrefs): applied entries are the healthy fetched sheets —
                evicting them re-creates the entry on the next scan and refetches live CORS sheets every ~30s forever
              */
              if (!entry.applied && (entry.sent || 0) && stamp - entry.sent > 30000) delete state.fetching[href];
            }
            /*
              bounded record hygiene: if the record set balloons on SPA style churn, evict created-but-never-walked untouched records first
              (they hold their sheet strongly; walked ones keep wrappers that may still apply)
            */
            if (engine.attach.all.size > 2000) {
              for (const record of engine.attach.all) {
                if (record.pushed === false && record.count === -1 && record.dirty === false && record.wrapper === null) engine.attach.all.delete(record);
                if (engine.attach.all.size <= 2000) break;
              }
            }
            /*
              bounced-sheet hygiene: an element-owned sheet whose <style>/<link> host left the DOM keeps a record + converted wrapper alive;
              the page can no longer use that sheet, so release bookkeeping and detach the wrapper (shadow-level wrappers live in detached roots — harmless, left alone)
            */
            if (engine.attach.all.size > 2000) {
              const orphans = [];
              for (const record of engine.attach.all) {
                const owner = record.sheet ? record.sheet.ownerNode : null;
                if (record.pushed === true && record.wrapper !== null && owner && owner.isConnected === false) orphans.push(record);
              }
              if (orphans.length) {
                const current = [...document.adoptedStyleSheets];
                for (const record of orphans) {
                  engine.attach.all.delete(record);
                  const position = engine.list.sheets.findIndex(function (item) { return item.record === record; });
                  if (position !== -1) engine.list.sheets.splice(position, 1);
                  const index = current.indexOf(record.wrapper);
                  if (index !== -1) current.splice(index, 1);
                }
                document.adoptedStyleSheets = current;
              }
            }
            /*  */
            let changed = 0;
            for (const record of engine.attach.all) {
              /*
                every record is polled, including empty un-pushed ones: an empty-at-walk sheet filled later purely via
                CSSOM insertRule fires no DOM events — only this poll can catch it, so vetoing empty records here
                pinned a page's late-hydrating stylesheets unconverted until a manual toggle/devtools perturbation
              */
              if (!record.sheet) continue;
              let count = 0;
              try { count = record.sheet.cssRules ? record.sheet.cssRules.length : 0; } catch (ex) { continue; }
              const key = engine.attach.key(record.sheet);
              if (record.count === count && record.key === key) continue;
              record.dirty = true;
              changed++;
            }
            /*  */
            if (changed) {
              smart.dark.say("sheetpoll: " + changed + " sheet(s) changed");
              engine.watch.queue.styles = true;
              engine.watch.schedule();
            }
            /*  */
            if (state.active === true) engine.watch.reset("sheetpoll", engine.watch.sheetpoll, 2000);
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "visible": function () {
          const state = smart.dark.state;
          const engine = smart.dark.engine;
          /*  */
          try {
            if (document.hidden === true) return;
            if (state.hidden === true) {
              state.hidden = false;
              engine.watch.schedule();
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "start": function () {
          const engine = smart.dark.engine;
          /*  */
          try {
            if (engine.watch.node) engine.watch.node.disconnect();
            /*  */
            engine.watch.node = new MutationObserver(engine.watch.listener);
            engine.watch.node.observe(document.documentElement, {
              "subtree": true,
              "childList": true,
              "attributes": true,
              "characterData": true,
              "attributeOldValue": true,
              "attributeFilter": [
                "style", 
                "class", 
                "hidden", 
                "open", 
                "disabled", 
                "href", 
                "rel", 
                "media", 
                "aria-expanded", 
                "aria-selected", 
                "data-state", 
                "data-theme"
              ]
            });
            /*  */
            document.addEventListener("visibilitychange", engine.watch.visible, false);
            engine.watch.reset("sheetpoll", engine.watch.sheetpoll, 2000);
            /*  */
            if (window.matchMedia) {
              engine.watch.media = window.matchMedia("(prefers-color-scheme: dark)");
              const media = engine.watch.media;
              if (media.addEventListener) media.addEventListener("change", engine.watch.scheme, false);
              else if (media.addListener) media.addListener(engine.watch.scheme);
            }
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        },
        "stop": function () {
          const engine = smart.dark.engine;
          try {
            if (engine.watch.node) engine.watch.node.disconnect();
            /*  */
            const media = engine.watch.media;
            if (media) {
              if (media.removeEventListener) media.removeEventListener("change", engine.watch.scheme, false);
              else if (media.removeListener) media.removeListener(engine.watch.scheme);
              engine.watch.media = null;
            }
            /*  */
            engine.watch.node = null;
            if (engine.watch.frame !== null) {
              window.cancelAnimationFrame(engine.watch.frame);
              engine.watch.frame = null;
            }
            /*  */
            document.removeEventListener("visibilitychange", engine.watch.visible, false);
            for (const name in engine.watch.timers) {
              window.clearTimeout(engine.watch.timers[name]);
              delete engine.watch.timers[name];
            }
            /*  */
            engine.watch.queue.roots = [];
            engine.watch.queue.nodes = [];
            engine.watch.queue.styles = false;
          } catch (e) {
            if (config.log) {
              console.error(e);
            }
          }
        }
      },
      "stop": function () {
        const engine = smart.dark.engine;
        const state = smart.dark.state;
        try {
          state.generation++;
          /*
            shadow.stop() empties shadow.roots — snapshot BEFORE teardown so attach.leave can still
            detach every sheet we adopted inside shadow trees (leave otherwise would see an empty list)
          */
          const activeRoots = state.active ? engine.shadow.roots.slice() : [];
          /*  */
          state.lates = 0;
          state.readies = 0;
          state.pending = [];
          state.fetching = {};
          state.proxy = false;
          state.queued = false;
          state.request = null;
          state.hidden = false;
          state.arrived = false;
          state.pendingroot = [];
          state.batching = false;
          state.darkpage = false;
          state.deferred = false;
          state.darkpinned = false;
          /*  */
          if (state.active) {
            /*
              a cover left up from an in-flight activation would otherwise pin a black page with no on-engine to lift it
            */
            config.temporarily.is.removed = true;
            config.temporarily.remove(0, 7);
            engine.attach.sweep(document);
            for (const item of engine.shadow.roots) engine.attach.sweep(item.root);
          }
          /*  */
          engine.shadow.stop();
          /*  */
          if (state.active) {
            state.active = false;
            engine.is.active = false;
            /*  */
            engine.watch.stop();
            engine.attach.leave(activeRoots);
            /*  */
            const nodes = document.querySelectorAll("[data-smart-dark-theme]");
            /*  */
            for (let i = 0; i < nodes.length; i++) {
              try {
                nodes[i].remove();
              } catch (ex) {
                if (config.log) {
                  console.error(ex);
                }
              }
            }
            /*  */
            const computed = state.computed;
            /*  */
            for (let i = computed.items.length - 1; i >= 0; i--) {
              const item = computed.items[i];
              try {
                if (item.node && item.node.classList) item.node.classList.remove(item.token);
              } catch (ex) {
                if (config.log) {
                  console.error(ex);
                }
              }
            }
            /*  */
            state.fixed = null;
            computed.items = [];
            computed.sheets = [];
            computed.sequence = 0;
            engine.list.items = [];
            engine.inline.sheets = [];
            state.internal = new WeakMap();
            computed.nodes = new WeakMap();
            engine.inline.cache = new WeakMap();
            /*
              the veil itself lived in the removed correction sheets - these guards must forget,
              or veiled photos stay bright after an off->on toggle
            */
            engine.deep.images = new WeakMap();
            engine.deep.veiled = new WeakSet();
            /*  */
            engine.color.cache.clear();
            engine.color.tokens.clear();
            engine.color.variables.clear();
            engine.color.prepare();
            /*  */
            engine.attach.all = new Set();
            engine.attach.marks = new WeakMap();
            /*  */
            if (document.documentElement) document.documentElement.removeAttribute("smart-dark-active");
          }
        } catch (e) {
          if (config.log) {
            console.error(e);
          }
        }
      }
    }
  }
};
