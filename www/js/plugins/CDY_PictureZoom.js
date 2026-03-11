/*:
 * @plugindesc [v1.0] 圖片縮放與平移外掛 (支援滾輪縮放與拖曳)
 * @author CDY (powered by Antigravity)
 *
 * @param MaxScale
 * @text 最大縮放倍率
 * @desc 圖片最大可放大的倍數 (預設: 5)
 * @type number
 * @decimals 1
 * @default 5.0
 *
 * @param MinScale
 * @text 最小縮放倍率
 * @desc 圖片最小可縮小的倍數 (預設: 1，代表原始大小)
 * @type number
 * @decimals 1
 * @default 1.0
 *
 * @param ZoomSensitivity
 * @text 縮放靈敏度
 * @desc 滾輪縮放的靈敏度 (推薦 0.05 ~ 0.2)
 * @type number
 * @decimals 2
 * @default 0.10
 *
 * @help
 * --- 插件功能 ---
 * 此插件讓您可以對遊戲中「顯示圖片」產生的圖片進行縮放與平移。
 * 1. 滾輪縮放：以滑鼠游標為中心進行放大或縮小。
 * 2. 拖曳平移：放大後按住滑鼠左鍵即可移動圖片。
 * 3. 快速重設：在圖片上點擊滑鼠右鍵可立即恢復原始大小與位置。
 *
 * --- 使用限制 ---
 * 此插件預設會影響所有顯示的圖片。
 * 如果您希望特定圖片不受影響，請在圖片檔名中包含「_static」字樣。
 *
 * --- 範例 ---
 * 檔名為 map_details.png -> 可縮放
 * 檔名為 ui_frame_static.png -> 不可縮放
 */

(function () {
    const parameters = PluginManager.parameters('CDY_PictureZoom');
    const MAX_SCALE = Number(parameters['MaxScale'] || 5.0);
    const MIN_SCALE = Number(parameters['MinScale'] || 1.0);
    const ZOOM_SENSITIVITY = Number(parameters['ZoomSensitivity'] || 0.10);
    const PAN_SPEED = 10; // 鍵盤平移速度

    // 將 A 鍵 (65) 映射到 RPG Maker 的 Input 系統
    Input.keyMapper[65] = 'zoomOut';

    // --- Touch 手勢相關處理 ---
    let _touchPoints = [];
    let _pinchStartDist = 0;
    let _pinchStartScale = 1.0;

    document.addEventListener('touchstart', (e) => {
        _touchPoints = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
        if (_touchPoints.length === 2) {
            _pinchStartDist = Math.hypot(_touchPoints[0].x - _touchPoints[1].x, _touchPoints[0].y - _touchPoints[1].y);
            // 由於 Sprite 是物件，暫不在此存 scale，留給 Sprite 自行在 update 中比對
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        _touchPoints = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        _touchPoints = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
        if (_touchPoints.length < 2) _pinchStartDist = 0;
    }, { passive: true });

    // --- Sprite_Picture 擴充 ---

    const _Sprite_Picture_initialize = Sprite_Picture.prototype.initialize;
    Sprite_Picture.prototype.initialize = function(pictureId) {
        _Sprite_Picture_initialize.call(this, pictureId);
        this.initZoomMembers();
    };

    Sprite_Picture.prototype.initZoomMembers = function() {
        this._zoomScale = 1.0;
        this._zoomOffset = { x: 0, y: 0 };
        this._isDragging = false;
        this._lastMousePos = { x: 0, y: 0 };
        this._keyZoomCooldown = 0;
        this._lastPinchDist = 0;
    };

    const _Sprite_Picture_update = Sprite_Picture.prototype.update;
    Sprite_Picture.prototype.update = function() {
        _Sprite_Picture_update.call(this);
        if (this.visible && this.bitmap && this.isActiveZoom()) {
            this.updateZoomInput();
            this.applyZoomTransform();
        }
    };

    /**
     * 判斷此圖片是否啟用縮放功能
     */
    Sprite_Picture.prototype.isActiveZoom = function() {
        const picture = this.picture();
        if (!picture) return false;
        const name = picture.name();
        return name && !name.contains('_static');
    };

    /**
     * 處理鍵盤、滑鼠/觸控輸入
     */
    Sprite_Picture.prototype.updateZoomInput = function() {
        // 1. 處理滾輪縮放與鍵盤縮放
        if (TouchInput.wheelY !== 0) {
            this.onWheel(TouchInput.wheelY);
        } else if (_touchPoints.length === 2 && _pinchStartDist > 0) {
            // 處理平板雙指手勢
            this.updatePinchZoom();
        } else {
            // 鍵盤放大：Z 鍵 (ok)
            const isZoomIn = Input.isPressed('ok') || (Input._latestButton === 'z' && Input.isPressed('z'));
            // 鍵盤縮小：A 鍵 (zoomOut)
            const isZoomOut = Input.isPressed('zoomOut') || (Input._latestButton === 'a' && Input.isPressed('a'));

            if (isZoomIn || isZoomOut) {
                if (this._keyZoomCooldown <= 0) {
                    const delta = isZoomIn ? ZOOM_SENSITIVITY : -ZOOM_SENSITIVITY;
                    this.performZoom(delta);
                    this._keyZoomCooldown = 4; // 防止縮放過快
                }
            }
        }
        if (this._keyZoomCooldown > 0) this._keyZoomCooldown--;

        // 2. 處理拖曳平移 (單指或滑鼠拖曳，以及方向鍵)
        // 移除 this._zoomScale > 1.0 的限制，允許在任何倍率下移動
        
        // 滑鼠或單指拖曳 (雙指時不觸發單指拖曳以避免跳動)
        if (TouchInput.isPressed() && _touchPoints.length < 2) {
            if (!this._isDragging) {
                this._isDragging = true;
                this._lastMousePos = { x: TouchInput.x, y: TouchInput.y };
            } else {
                const dx = TouchInput.x - this._lastMousePos.x;
                const dy = TouchInput.y - this._lastMousePos.y;
                this._zoomOffset.x += dx;
                this._zoomOffset.y += dy;
                this._lastMousePos = { x: TouchInput.x, y: TouchInput.y };
            }
        } else {
            this._isDragging = false;
        }

        // 方向鍵平移 (keyboard)
        if (Input.isPressed('left')) this._zoomOffset.x += PAN_SPEED;
        if (Input.isPressed('right')) this._zoomOffset.x -= PAN_SPEED;
        if (Input.isPressed('up')) this._zoomOffset.y += PAN_SPEED;
        if (Input.isPressed('down')) this._zoomOffset.y -= PAN_SPEED;

        // 3. 處理重設 (右鍵或取消鍵 X/Esc，或雙指點擊)
        if (TouchInput.isCancelled() || Input.isTriggered('cancel')) {
            this.resetZoom();
        }

        this.constrainOffset();
    };

    /**
     * 處理雙指縮放邏輯
     */
    Sprite_Picture.prototype.updatePinchZoom = function() {
        const p1 = _touchPoints[0];
        const p2 = _touchPoints[1];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        
        if (this._lastPinchDist === 0) {
            this._lastPinchDist = dist;
            return;
        }

        // 計算縮放中心 (雙指中點)
        // 由於 DOM 座標可能與 Canvas 不一致，需透過校正係數或 Graphics 處理
        const midX = (p1.x + p2.x) / 2 * (Graphics.width / window.innerWidth);
        const midY = (p1.y + p2.y) / 2 * (Graphics.height / window.innerHeight);

        const deltaDist = dist - this._lastPinchDist;
        const scaleChange = (deltaDist / 200) * this._zoomScale; // 動態計算縮放比例
        
        if (Math.abs(scaleChange) > 0.001) {
            this.performZoomWithCenter(scaleChange, midX, midY);
            this._lastPinchDist = dist;
        }
    };

    /**
     * 滾輪事件處理
     */
    Sprite_Picture.prototype.onWheel = function(wheelY) {
        const delta = wheelY > 0 ? -ZOOM_SENSITIVITY : ZOOM_SENSITIVITY;
        this.performZoom(delta);
    };

    /**
     * 執行縮放邏輯 (以目前游標/中心點為準)
     */
    Sprite_Picture.prototype.performZoom = function(delta) {
        const centerX = TouchInput.x > 0 ? TouchInput.x : Graphics.width / 2;
        const centerY = TouchInput.y > 0 ? TouchInput.y : Graphics.height / 2;
        this.performZoomWithCenter(delta, centerX, centerY);
    };

    /**
     * 核心縮放公式：指定中心點
     */
    Sprite_Picture.prototype.performZoomWithCenter = function(delta, centerX, centerY) {
        const oldScale = this._zoomScale;
        this._zoomScale = (this._zoomScale + delta).clamp(MIN_SCALE, MAX_SCALE);

        if (oldScale !== this._zoomScale) {
            const ratio = this._zoomScale / oldScale;
            this._zoomOffset.x = centerX - (centerX - this._zoomOffset.x) * ratio;
            this._zoomOffset.y = centerY - (centerY - this._zoomOffset.y) * ratio;
        }
    };

    /**
     * 將縮放與偏移套用到 Sprite
     */
    Sprite_Picture.prototype.applyZoomTransform = function() {
        const picture = this.picture();
        if (picture) {
            const baseScaleX = picture.scaleX() / 100;
            const baseScaleY = picture.scaleY() / 100;
            
            this.scale.x = baseScaleX * this._zoomScale;
            this.scale.y = baseScaleY * this._zoomScale;
            
            this.x += this._zoomOffset.x;
            this.y += this._zoomOffset.y;
        }
    };

    /**
     * 限制偏移量 (目前僅處理手勢狀態清理)
     */
    Sprite_Picture.prototype.constrainOffset = function() {
        if (this._zoomScale <= 1.0) {
            // 不再強制歸零位移，允許 1 倍時也能移動
            this._lastPinchDist = 0;
        }
    };

    /**
     * 重設縮放狀態
     */
    Sprite_Picture.prototype.resetZoom = function() {
        this._zoomScale = 1.0;
        this._zoomOffset = { x: 0, y: 0 };
        this._isDragging = false;
        this._lastPinchDist = 0;
    };

})();
