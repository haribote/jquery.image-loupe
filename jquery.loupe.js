/**!
 * jquery.image-loupe.js
 * @desc    A touchable image magnifyer plug-in for smart devices.
 * @see     {@link https://github.com/haribote/jquery.image-loupe}
 * @author  KIMURA Tetsuro
 * @license The MIT License (MIT)
 */

;(function (window, $, undefined) {
  'use strict';

  /**
   * loupe plug-in
   */
  $.fn.loupe = (function () {
    /**
     * プライベート
     * @prop {jQuery} $window
     * @prop {Number} windowWidth
     * @prop {Number} windowHeight
     * @prop {Boolean} listened
     * @prop {Array} collection
     * @prop {Array} touchList
     * @prop {Number} frameRate
     */
    var $window      = null;
    var windowWidth  = window.innerWidth;
    var windowHeight = window.innerHeight;
    var listened     = false;
    var collection   = [];
    var touchList    = null;
    var frameRate    = 1000 / 60;

    /**
     * 1/n までの値を四捨五入して返すメソッド
     * @param {Number} val;
     * @param {Number} n;
     */
    var round = function (val, n) {
      return Math.round(val * n) / n;
    };

    /**
     * Loupe
     * @class
     * @param {HtmlElement} el
     * @param {Object} options
     * @prop {HtmlElement} el
     * @prop {jQuery} $el
     * @prop {Object} options
     * @prop {Number} width
     * @prop {Number} height
     * @prop {Number} maxAbsX
     * @prop {Number} maxAbsY
     * @prop {Number} lastX
     * @prop {Number} lastY
     * @prop {Number} offsetX
     * @prop {Number} offsetY
     * @prop {Number} firstD
     * @prop {Number} scale
     * @prop {Number} minS
     */
    var Loupe = function (el, options) {
      // プロパティ
      this.el      = el;
      this.$el     = $(this.el);
      this.options = options || {};
      this.width   = 0;
      this.height  = 0;
      this.maxAbsX = 0;
      this.maxAbsY = 0;
      this.lastX   = null;
      this.lastY   = null;
      this.offsetX = 0;
      this.offsetY = 0;
      this.firstD  = null;
      this.firstS  = null;
      this.scale   = 1;
      this.minS    = 0.5;

      // コレクションに追加する
      collection.push(this);

      // 画像の読み込んで機能を有効化する
      this.load(this.el.src).done((function (_this) {
        return function () {
          _this.onLoad();
        }
      })(this));

      // イベントを購読する
      this.subscribeAll();
    };

    /**
     * 画像の読み込みを待つメソッド
     * @param {String} src
     * @returns {$.Deferred}
     */
    Loupe.prototype.load = function (src) {
      // キャッシュ
      var def = $.Deferred();

      // 画像を読み込む
      var elImg = document.createElement('img');
      $(elImg).on('load', null, function () {
        def.resolve(src);
      });
      elImg.src = src;

      // promise を返す
      return def.promise();
    };

    /**
     * 画像が全て読み込まれたら実行されるハンドラー
     */
    Loupe.prototype.onLoad = function () {
      $window.resize();
    };

    /**
     * 位置をリセットするメソッド
     */
    Loupe.prototype.resetPosition = function () {
      // 機能を活性化させる
      this.activate();

      // 画像のサイズと移動最大値をキャッシュする
      this.width   = this.$el.width();
      this.height  = this.$el.height();
      this.minS    = Math.max(round((windowWidth / this.width), 100), round((windowHeight / this.height), 100));
      this.scale   = Math.max(1, this.minS);
      var offset   = this.getOffset();
      this.maxAbsX = Math.abs(offset.x);
      this.maxAbsY = Math.abs(offset.y);

      // 画像のラッパーの大きさを設定する
      this.$el.parent().css({
        'width' : windowWidth,
        'height': windowHeight
      });

      // 画像の位置を設定する
      var margin = [offset.y, 0, 0, offset.x];
      this.$el.css({
        margin: (function (list) {
          for (var i= 0, l=list.length; i<l; i++) {
            list[i] += 'px';
          }
          return list.join(' ');
        })(margin)
      });
      this.setPosition(0, 0);
    };

    /**
     * 位置を設定するメソッド
     * @param {Number} x
     * @param {Number} y
     */
    Loupe.prototype.setPosition = function (x, y) {
      // キャッシュ
      var _x = Math.round(x);
      var _y = Math.round(y);

      // 画像の位置をキャッシュする
      var offset   = this.getOffset();
      this.maxAbsX = Math.abs(offset.x);
      this.maxAbsY = Math.abs(offset.y);
      if (this.maxAbsX >= Math.abs(_x)) {
        this.offsetX = _x;
      } else if (this.maxAbsX < Math.abs(this.offsetX)) {
        this.offsetX = offset.x * (this.offsetX < 0 ? 1 : -1);
      }
      if (this.maxAbsY >= Math.abs(_y)) {
        this.offsetY = _y;
      } else if (this.maxAbsY < Math.abs(this.offsetY)) {
        this.offsetY = offset.y * (this.offsetY < 0 ? 1 : -1);
      }

      // 行列に詰め込む
      var matrix = [this.scale, 0, 0, this.scale, this.offsetX, this.offsetY];

      // スタイルを設定する
      this.$el.css({
        'transform': 'matrix(' + matrix.join(', ') + ')'
      });
    };

    Loupe.prototype.getOffset = function () {
      var calc = (function (_this) {
        return function (win, img) {
          return Math.round((win - img * _this.scale) / 2)
        }
      })(this);

      return {
        x: calc(windowWidth, this.width),
        y: calc(windowHeight, this.height)
      };
    };

    /**
     * UIを活性化させるメソッド
     */
    Loupe.prototype.activate = function () {
      this.$el.addClass('is-active');
    };

    /**
     * タッチリストの内容を確認して必要な処理を実行するメソッド
     */
    Loupe.prototype.dispatch = function () {
      // タッチリストがnullならば何もしない
      if (touchList === null) {
        return;
      }

      // タッチリストの長さを判定する
      if (touchList.length === 1) {
        // 長さが1ならば画像の位置を動かす
        this.move();
      } else if (touchList.length > 1) {
        // 長さが1良いも大きければ画像を拡縮させる
        this.zoom();
      }

      // ディスパッチャーをタイマーで再帰的に実行する
      window.setTimeout((function (_this) {
        return function () {
          _this.dispatch();
        }
      })(this), frameRate);
    };

    /**
     * 画像の位置を動かすメソッド
     */
    Loupe.prototype.move = function () {
      // キャッシュ
      var currentX = Loupe.getTouchProp(0, 'pageX');
      var currentY = Loupe.getTouchProp(0, 'pageY');

      // 最初のタッチをキャッシュする
      if (this.lastX === null && this.lastY === null) {
        this.lastX = currentX;
        this.lastY = currentY;
      }

      // 位置に変更がなければ処理を中断する
      if (this.lastX === currentX && this.lastY === currentY) {
        return;
      }

      // 位置を更新する
      this.setPosition(this.offsetX + (currentX - this.lastX), this.offsetY + (currentY - this.lastY));
      this.lastX = currentX;
      this.lastY = currentY;
    };

    /**
     * 画像を拡縮させるメソッド
     */
    Loupe.prototype.zoom = function () {
      // キャッシュ
      var currentX0  = Loupe.getTouchProp(0, 'pageX');
      var currentY0  = Loupe.getTouchProp(0, 'pageY');
      var currentX1  = Loupe.getTouchProp(1, 'pageX');
      var currentY1  = Loupe.getTouchProp(1, 'pageY');
      var currentD   = Math.round(Math.sqrt(Math.pow(Math.abs(currentX1 - currentX0), 2) + Math.pow(Math.abs(currentY1 - currentY0), 2)));

      // 最初のタッチをキャッシュする
      if (this.firstD === null) {
        this.firstD = currentD;
        this.firstS = this.scale;
      }

      // 拡大率を算出する
      var scale = round((currentD / this.firstD * this.firstS), 100);

      // 拡大率に変化がなければ処理を中断する
      if (this.scale === scale) {
        return;
      }

      // 位置を更新する
      this.scale = Math.max(Math.min(scale, 2), this.minS);
      this.setPosition(this.offsetX, this.offsetY);
    };

    /**
     * タッチオブジェクトのプロパティを返すメソッド
     * @static
     * @param {Number} index
     * @param {String} key
     */
    Loupe.getTouchProp = function (index, key) {
      return touchList[index] ? touchList[index][key] : undefined;
    };

    /**
     * イベントの購読設定をするメソッド
     */
    Loupe.prototype.subscribeAll = function () {
      // タッチスタート
      this.$el.on('touchstart.loupe', null, (function (_this) {
        return function () {
          _this.touchStartHandler.apply(_this, arguments);
        }
      })(this));

      // リサイズ
      if (!listened) {
        $window.on('resize', null, Loupe.resizeHandler);
        listened = true;
      }
    };

    /**
     * タッチスタートイベントハンドラー
     * @param {Event} ev
     */
    Loupe.prototype.touchStartHandler = function (ev) {
      ev.preventDefault();

      // タッチリストオブジェクトをキャッシュ
      touchList = window.event.touches;

      // タッチムーブ・エンドイベントをバインド
      $window
        .on('touchmove.loupe', null, Loupe.touchMoveHandler)
        .on('touchend.loupe touchcancel.loupe', null, Loupe.touchEndHandler);

      // タッチイベント中の処理を引き当てる
      this.dispatch();
    };

    /**
     * タッチムーブイベントハンドラー
     * @param {Event} ev
     */
    Loupe.touchMoveHandler = function (ev) {
      ev.preventDefault();

      // タッチリストオブジェクトを更新する
      touchList = window.event.touches;
    };

    /**
     * タッチエンドイベントハンドラー
     * @param ev
     */
    Loupe.touchEndHandler = function (ev) {
      ev.preventDefault();

      // タッチリストオブジェクトを消去する
      touchList = null;

      // 全てのインスタンスのタッチ座標を消去する
      for (var i= 0, l= collection.length; i<l; i++) {
        collection[i].lastX  = null;
        collection[i].lastY  = null;
        collection[i].firstD = null;
        collection[i].firstS = null;
      }

      // タッチムーブ・エンドイベントをアンバインド
      $window
        .off('touchmove.loupe')
        .off('touchend.loupe touchcancel.loupe');
    };

    /**
     * リサイズイベントハンドラー
     * @static
     */
    Loupe.resizeHandler = function (ev) {
      // ウィンドウサイズを更新する
      windowWidth  = window.innerWidth;
      windowHeight = window.innerHeight;

      // 全てのインスタンスの位置をリセットする
      for (var i= 0, l= collection.length; i<l; i++) {
        collection[i].resetPosition();
      }
    };

    /**
     * 要素ごとにインスタンスを生成する
     */
    return function (options) {
      if ($window === null) {
        $window = $(window);
      }

      this.each(function (index, el) {
        return new Loupe(el, options);
      });

      return this;
    };
  })();
})(window, jQuery);
