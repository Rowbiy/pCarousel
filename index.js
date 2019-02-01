/**
 * 轮播图插件 pCarousel.js
 * Rowbiy (https://github.com/Rowbiy)
 * 2018-12
 */

(function(){

    function PCarousel(config){
        if(typeof config !== 'object' || !this.isArray(config.images)) {
            console.error('Error: Missing the images to show, please set them');
            return;
        }
        this.config = {
                 wrapId: config.id || 'p_carousel',       // 包裹容器ID
              wrapWidth: config.wrapWidth || '600',       // 包裹容器宽度
             wrapHeight: config.wrapHeight || '300',      // 包裹容器高度
                 images: config.images || [],             // 图片src
                  links: config.links || [],              // 图片对应的点击跳转地址
              threshold: config.threshold || 0.1,         // 滑动触发阀值
                buttons: config.buttons || true,          // 是否展示左右按钮
              indicator: config.indicator || true,        // 是否显示圆点指示器
                  color: config.color || '#fff',          // 圆点指示器颜色
              slideTime: config.slideTime || 700,         // 滑动持续时间，毫秒
               duration: config.duration || 2000,         // 每页停留时长，毫秒
                  index: config.index || 0,               // 初始化页面下标
              indiColor: config.indiColor || '#1593ff',   // 指示器选中颜色
            indiBgColor: config.indiBgColor || '#e6ebed', // 指示器背景颜色
        };

        // 生成分片页面
        this.init();
        // 为包裹容器绑定事件
        this.bindEvents()
    }

    PCarousel.prototype = {
        fragLength: 0,        // 滑块个数
        inMove: false,        // 标记是否在拖拽移动中
        hasDown: false,       // 鼠标是否按下
        downTime: 0,          // 鼠标按下时间
        touchX: 0,            // 鼠标接触点X坐标
        distX: 0,             // 拖动过程中产生的X偏移量
        wrapWidth: 0,         // 包裹容器宽度
        inSliding: false,     // 标记是否在移动过程中
        spanLock: false,      // 翻页显示器按钮是否被点击
        taskTimer: null,      // 定时轮播翻页任务
        taskAtTime: 0,        // 执行一次轮播的时刻
        /**
         * 生成/获取总包裹容器
         * @param selector
         * @returns {NodeListOf<Element>}
         * @constructor
         */
        G: function (selector) {
            var s = document.querySelectorAll(selector);
            if (s.length) {
                s = s[0]
            }else{
                s = document.createElement('div');
                s.setAttribute('id', this.config.id || 'p_carousel');
                s.style.zIndex = '1';
                document.body.appendChild(s);
            }
            s.style.position = 'relative';
            s.style.height = 'auto';
            // s.style.width = '600px';
            s.style.overflow = 'hidden';
            return s;
        },
        /**
         * 初始化
         */
        init: function () {
            this.fragLength = this.config.images.length;
            if (this.fragLength < 1){
                console.warn('Warning: There isn`t images inside...');
            }

            // 校验index
            if (this.config.index >= this.fragLength){
                console.warn('Warning: The index is wrong, we set it to 0...');
                this.config.index = 0;
            }

            // 生成包裹容器
            var c = this.G("#" + this.config.wrapId);
            this.wrapWidth = parseInt(window.getComputedStyle(c, null).width);

            // 实际包裹容器
            var f = document.createElement('div');
            f.style.display = 'flex';
            f.setAttribute('class', 'p-carousel-w');
            f.style.position = 'relative';
            f.style.height = '100%';
            f.style.transform = "translate3d(" + -(this.config.index + 1) * this.wrapWidth + "px,0,0)";
            f.style.alignItems = 'flex-start';


            for (var i = 0; i < this.fragLength; i++) {
                var d = document.createElement('div');
                d.setAttribute('class', 'p-carousel-f');
                d.style.position = 'relative';
                d.style.height = '100%';
                d.style.width = this.wrapWidth + 'px';
                d.style.cursor = 'pointer';
                d.style.boxSizing = 'border-box';
                d.style.flexShrink = '0';
                d.setAttribute('data-id', i);

                var m = document.createElement('img');
                m.style.width = '100%';
                m.style.height = '100%';
                m.style.verticalAlign = 'middle';
                m.style.border = '0';
                m.setAttribute('src', this.config.images[i]);

                var a = document.createElement('a');
                a.setAttribute('href', this.config.links[i] || 'javascript:void(0);');
                a.setAttribute('target', '_blank');
                a.style.texDecoration = 'none';
                a.appendChild(m);

                d.appendChild(a);
                f.appendChild(d);
            }
            // 添加复制块
            var duplicateE = f.children[0].cloneNode(true);
            var duplicateS = f.children[this.fragLength - 1].cloneNode(true);
            duplicateE.className += ' p-duplicate p-duplicate-end';
            duplicateS.className += ' p-duplicate p-duplicate-start';

            f.appendChild(duplicateE);
            f.prepend(duplicateS);
            // 禁止图片被拖动
            for (i = 0; i < f.children.length; i++) {
                this.addEvent(f.children[i], 'dragstart', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                });
            }

            this.wrap = f;
            c.appendChild(f);

            // 生成翻页指示器
            this.setIndicator();


            // 设置定时翻页任务
            this.setTask(this.config.index);
        },
        /**
         * 非拖拽翻页 到 指定页 处理
         * @param index
         */
        slideTo: function (index) {
            var _this = this;
            this.spanLock = true;
            this.inSliding = true;
            this.M(this.wrap, -(index + 1) * this.wrapWidth, true);
            this.setIndicator(index);
            setTimeout(function () {
                _this.inSliding = false;
                _this.config.index = index;
                _this.spanLock = false;
                _this.distX = 0;
                !_this.taskTimer && _this.setTask();
            }, this.config.slideTime);
        },
        doTask: function () {
            // 实际在setTimeout里执行翻页逻辑的时间
            // chrome浏览器高版本在窗口/选项卡失焦后，会降低处理频率，导致setTimeout周期变长
            var realTime = new Date().getTime();
            if(realTime - this.taskAtTime > (this.config.duration + 60)) {
                // 取消这次dom操作
                return;
            }
            var dest = this.config.index === this.fragLength - 1 ? 0 : this.config.index + 1;
            this.slideTo(dest);
        },
        goNext: function () {

        },
        goPrev: function () {},
        setTask: function () {
            var _this = this;
            // 分配任务的时刻
            this.taskAtTime = new Date().getTime();
            this.taskTimer = setTimeout(function () {
                _this.doTask();
                _this.requestAnimation()(_this.setTask.bind(_this));
            }, this.config.duration);
        },
        requestAnimation: function () {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame  ||
                window.mozRequestAnimationFrame || function(callback){
                    setTimeout(callback, 1000 / 60);
                }
        },
        /**
         * 设置翻页指示器
         * @param index
         */
        setIndicator: function (index) {
            var indicator = document.getElementsByClassName('p-indicator')[0];
            if (indicator) {
                for (var j = 0; j < this.fragLength; j++) {
                    indicator.children[j].setAttribute('class', j === index ? 'p-active' : '')
                    indicator.children[j].style.backgroundColor = j === index ? this.config.indiColor : this.config.indiBgColor;
                }
            } else {
                var d = document.createElement('div');
                d.setAttribute('class', 'p-indicator');
                d.style.position = 'absolute';
                d.style.bottom = '12px';
                d.style.width = '100%';
                d.style.textAlign = 'center';
                for (var i = 0; i < this.fragLength; i++) {
                    var s = document.createElement('span');
                    s.setAttribute('class', i === this.config.index ? 'p-active' : '');
                    s.style.display = 'inline-block';
                    s.style.width = '10px';
                    s.style.height = '10px';
                    s.style.borderRadius = '100%';
                    s.style.cursor = 'pointer';
                    s.style.transition = 'all .3s ease';
                    s.style.backgroundColor = i === this.config.index ? this.config.indiColor : this.config.indiBgColor;
                    s.style.margin = '0 8px';
                    var that = this;
                    this.addEvent(s, 'mouseenter', function (e) {
                        e.target.style.backgroundColor = that.config.indiColor;
                        e.stopPropagation();
                    });
                    this.addEvent(s, 'mouseout', function (e) {
                        e.stopPropagation();
                        if (that.inSliding) return;
                        if (e.target.className.indexOf('active') >= 0) {
                            e.target.style.backgroundColor = that.config.indiColor;
                        } else {
                            e.target.style.backgroundColor = that.config.indiBgColor;
                        }

                    });
                    // 指示器点击
                    (function (i) {
                        that.addEvent(s, 'click', function (e) {
                            if (i !== that.config.index) {
                                // 点击完去除定时翻页，否则冲突效果
                                if (that.taskTimer) {
                                    clearTimeout(that.taskTimer);
                                    that.taskTimer = null;
                                }
                                if (that.spanLock) return;
                                that.slideTo(i);
                            }
                            e.stopPropagation();
                        });
                    })(i);
                    d.appendChild(s);
                }
                this.wrap.parentNode.appendChild(d);
            }
        },
        bindEvents: function () {
            var _this = this;

            this.addEvent(this.wrap, 'mousedown', function (e) {
                if (_this.inSliding || e.target.nodeName === 'SPAN') return;
                _this.hasDown = true;
                _this.downTime = new Date().getTime();
                var touch = e.touches ? e.touches[0] : e ;
                _this.touchX = touch.pageX;
            });

            this.addEvent(this.wrap, 'mousemove', function (e) {
                if (!_this.hasDown || _this.inSliding || e.target.nodeName === 'SPAN') return;
                // 如果有定时翻页任务，清除
                if (_this.taskTimer) {
                    clearTimeout(_this.taskTimer);
                    _this.taskTimer = null;
                }
                var touch = e.touches ? e.touches[0] : e ;
                _this._move(touch.pageX);
            });

            this.addEvent(this.wrap, 'mouseup', function (e) {
                if (_this.inSliding || e.target.nodeName === 'SPAN') return;
                var upTime = new Date().getTime();
                // 排除点击事件
                if (upTime - _this.downTime > 100) {
                    if (_this.distX === 0) return;
                    _this.inMove = true;
                    // 滑动过程中加锁
                    _this.inSliding = true;
                    // 重置点击锁
                    setTimeout(function () {
                        _this.inMove = false;
                    }, 50);
                    _this.doSlide();
                }
            });

            // 右键不走click
            this.addEvent(this.wrap, 'click', function (e) {
                if (_this.inMove || _this.inSliding) {
                    e.preventDefault();
                    return;
                }
                // 点击完后，重制hasDown
                _this.hasDown = false;
                e.stopPropagation();
            })

            // 鼠标离开当前区域，典型右键场景
            this.addEvent(this.wrap, 'mouseleave', function (e) {
                _this.hasDown = false;
                if (_this.distX !== 0) {
                    _this.doSlide();
                }
                e.stopPropagation();
            })
        },
        /**
         * 根据拖动距离处理松手后的滑动
         */
        doSlide: function () {
            // 记录下一页的index
            var k;
            var _this = this;
            if (Math.abs(this.distX) <= this.wrapWidth * this.config.threshold) {
                // reset
                this.reset();
                k = this.config.index;
            } else {
                // slide
                this.M(this.wrap, this.getDist(this.distX > 0 ? this.wrapWidth : -this.wrapWidth), true);
                k = this.distX > 0 ? (this.config.index === 0 ? this.fragLength - 1 : this.config.index - 1) : (this.config.index === this.fragLength - 1 ? 0 : this.config.index + 1);
                _this.setIndicator(k);
            }
            setTimeout(function () {
                _this.config.index = k;
                _this.inSliding = false;
                _this.hasDown = false;
                _this.distX = 0;
                !_this.taskTimer && _this.setTask();
            }, _this.config.slideTime)
        },
        /**
         * 页面reset
         */
        reset: function () {
            if (this.distX !== 0) {
                this.M(this.wrap, this.getDist(0), true);
            }
        },
        /**
         * 移动视口实体
         * @param pageX，实时点
         * @private null
         */
        _move: function (pageX) {
            var dist = pageX - this.touchX;
            this.distX = dist;
            if (dist !== 0) {
                this.M(this.wrap,  this.getDist(dist));
            }
        },
        /**
         * 获取实际偏移量
         * @param dist
         * @returns {*}
         */
        getDist: function (dist) {
            return -(this.config.index + 1) * this.wrapWidth + dist;
        },

        /**
         * 移动结点
         * @param node，被移动的结点
         * @param dist，移动距离
         * @param transition，是否添加动画
         */
        M: function (node, dist, transition) {
            var _this = this;
            (function (node, dist, transition) {
                if (node){
                    node.style.cssText += transition ? ' ;transition: transform ' + _this.config.slideTime + 'ms ease;' : ' transition-duration: 0s;';
                    dist = dist.toString() + 'px';
                    node.style.cssText += ";-webkit-transform: translate3d(" + dist + ", 0px, 0px);";
                    if (transition){
                        setTimeout(function () {
                            node.style.transitionDuration = '0s';
                        }, _this.config.slideTime)
                    }
                }
            })(node, dist, transition);
        },
        /**
         * 绑定事件
         * @param obj
         * @param ev
         * @param fn
         */
        addEvent: function (obj, ev, fn) {
            if (obj.attachEvent) {
                obj.attachEvent("on" + ev, fn);
            } else {
                obj.addEventListener(ev, fn, false);
            }
        },
        /**
         * 判断是否数组
         * @param obj
         * @returns {boolean}
         */
        isArray: function (obj) {
            return Object.prototype.toString.call(obj) === '[object Array]';
        }
    };

    //兼容模块定义
    if(typeof module === 'object' && typeof module.exports === 'object'){
        module.exports = PCarousel;
    } else if(typeof define === 'function' && (define.amd || define.cmd)){
        define(function(){
            return PCarousel;
        })
    }else{
        window.pCarousel = PCarousel;
    }
})()

