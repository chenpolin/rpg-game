/*:
 * @plugindesc [最終版] 顯示輸入框，將結果存入變數，同時鎖定遊戲畫面防止移動。
 * @author CDY
 *
 * @param backendUrl
 * @text Backend URL
 * @desc 您的後台網址 (Google Apps Script 部署的網頁應用程式網址)。
 * @type string
 * @default
 *
 * @help
 * 最終版本更新紀錄：
 * - v2.2: 新增全螢幕遮罩，在輸入框出現時徹底阻止玩家點擊背景移動。
 * - v2.1: 增大輸入框、字體與按鈕，優化手機上的觸控體驗。
 * - v2.0: 修正了在手機上點擊輸入框時，會導致角色移動的觸控衝突問題。
 * - 移除了不必要的「更改玩家名稱」功能。
 *
 * --- 前置設定 ---
 * 1. 你必須先在本插件的「參數設定」中，填入你自己的後台網址 (Backend URL)。
 *
 * --- 如何使用 ---
 * 1. 在事件中選擇「插件指令...」。
 *
 * 2. 輸入以下指令:
 * InputAndSend 變數ID
 */

(function() {

    // 關鍵修改：確保這裡的名稱與您的檔案名一致
    const parameters = PluginManager.parameters('CDY_InputAndSend');
    const backendUrl = String(parameters['backendUrl'] || '');

    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (command === 'InputAndSend') {
            if (!backendUrl) {
                console.error('CDY_InputAndSend 錯誤: 後台 URL 未在插件參數中設定！');
                return;
            }
            
            const variableId = parseInt(args[0]) || 1;
            const interpreter = this;

            const backdrop = document.createElement('div');
            backdrop.style.position = 'fixed';
            backdrop.style.top = '0';
            backdrop.style.left = '0';
            backdrop.style.width = '100vw';
            backdrop.style.height = '100vh';
            backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            backdrop.style.zIndex = '99';

            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            container.style.padding = '25px';
            container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            container.style.border = '2px solid white';
            container.style.borderRadius = '10px';
            container.style.zIndex = '100';

            const stopPropagation = (event) => event.stopPropagation();
            [backdrop, container].forEach(element => {
                element.addEventListener('touchstart', stopPropagation);
                element.addEventListener('touchmove', stopPropagation);
                element.addEventListener('touchend', stopPropagation);
                element.addEventListener('mousedown', stopPropagation);
                element.addEventListener('mouseup', stopPropagation);
                element.addEventListener('wheel', stopPropagation);
            });

            const inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.placeholder = '請在此輸入...';
            inputElement.style.boxSizing = 'border-box';
            inputElement.style.width = '70vw';
            inputElement.style.maxWidth = '450px';
            inputElement.style.padding = '15px';
            inputElement.style.fontSize = '24px';

            const buttonElement = document.createElement('button');
            buttonElement.textContent = '確定';
            buttonElement.style.padding = '15px 25px';
            buttonElement.style.fontSize = '24px';
            buttonElement.style.marginLeft = '15px';

            container.appendChild(inputElement);
            container.appendChild(buttonElement);
            
            document.body.appendChild(backdrop);
            document.body.appendChild(container);
            
            inputElement.focus();
            interpreter.setWaitMode('input_and_send');

            const cleanupUI = () => {
                document.body.removeChild(container);
                document.body.removeChild(backdrop);
                interpreter.setWaitMode('');
            };

            buttonElement.addEventListener('click', () => {
                const inputText = inputElement.value;
                if (inputText) {
                    $gameVariables.setValue(variableId, inputText);
                    
                    const dataToSend = {
                        name: $gameParty.leader().name(),
                        text: $gameVariables.value(variableId)
                    };

                    $gameMessage.add("感謝您的訊息，正在為您記錄...");

                    fetch(backendUrl, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dataToSend),
                    })
                    .then(() => { $gameMessage.add("記錄成功！"); })
                    .catch(error => {
                        console.error('InputAndSend 傳送錯誤:', error);
                        $gameMessage.add("記錄失敗，請檢查網路連線。");
                    })
                    .finally(cleanupUI);

                } else {
                    alert('請輸入有效的文字！');
                }
            }, { once: true });
        }
    };
})();