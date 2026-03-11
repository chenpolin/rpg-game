/*:
 * @plugindesc [v3.0] 學生自我解釋 (SE) 文字輸入與傳送插件
 * @author CDY
 *
 * @param backendUrl
 * @text Backend URL
 * @desc 請輸入 https://rpg-logger-2026.fly.dev/api/se_log
 * @type string
 * @default https://rpg-logger-2026.fly.dev/api/se_log
 *
 * @param idVariable
 * @text 學號變數 ID
 * @desc 儲存學號的變數 ID (預設為 88)
 * @type number
 * @default 88
 *
 * @param resultVariable
 * @text 結果變數 ID
 * @desc 儲存傳送結果的變數 ID (1=成功, 0=失敗，預設為 81)
 * @type number
 * @default 81
 *
 * @help
 * --- 如何使用 ---
 * 1. 在事件中選擇「插件指令...」。
 * 2. 輸入指令：
 * SEInput 題號
 *
 * 範例：SEInput SEQ1
 * 這會打開輸入框，並將學生寫的內容存入變數 87，同時傳送到後台。
 * 傳送到後台的內容會自動加上題號前綴，例如：SEQ1-內容
 */

(function () {
    const parameters = PluginManager.parameters('CDY_SELogger');
    const backendUrl = String(parameters['backendUrl'] || '');
    const idVariable = parseInt(parameters['idVariable'] || 88);
    const resultVariableId = parseInt(parameters['resultVariable'] || 81);
    const targetVariableId = 87; // 學生寫的內容存入變數 87 預設值

    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (command === 'SEInput') {
            const questionId = args[0] || "SEQ1"; // 預設為 SEQ1
            const studentId = $gameVariables.value(idVariable) || "Unknown";
            const interpreter = this;

            // 建立 UI 遮罩與容器 (參考原本插件的設計)
            const backdrop = document.createElement('div');
            backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:99;';

            const container = document.createElement('div');
            container.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:25px;background:rgba(20,20,20,0.9);border:2px solid gold;border-radius:15px;z-index:100;width:350px;text-align:center;';

            const title = document.createElement('div');
            title.style.cssText = 'color:white;margin-bottom:15px;font-weight:bold;font-size:18px;';
            title.innerText = "請寫下您的想法";

            const inputElement = document.createElement('textarea');
            inputElement.style.cssText = 'width:100%;height:150px;padding:10px;font-size:16px;border-radius:5px;border:none;';
            inputElement.placeholder = "請寫下您的想法...(最少50字)";

            const buttonElement = document.createElement('button');
            buttonElement.style.cssText = 'margin-top:20px;padding:10px 30px;font-size:18px;cursor:pointer;background:gold;color:black;border:none;border-radius:5px;font-weight:bold;';
            buttonElement.innerText = "提交並繼續";

            container.appendChild(title);
            container.appendChild(inputElement);
            container.appendChild(buttonElement);
            document.body.appendChild(backdrop);
            document.body.appendChild(container);

            // 阻止事件冒泡，防止觸發遊戲地圖移動
            const stopPropagation = (event) => event.stopPropagation();
            [backdrop, container].forEach(element => {
                element.addEventListener('touchstart', stopPropagation);
                element.addEventListener('touchmove', stopPropagation);
                element.addEventListener('touchend', stopPropagation);
                element.addEventListener('mousedown', stopPropagation);
                element.addEventListener('mouseup', stopPropagation);
                element.addEventListener('wheel', stopPropagation);
            });

            // 自動聚焦輸入框
            inputElement.focus();

            // 鎖定遊戲移動 (參考原本插件邏輯)
            interpreter.setWaitMode('input_and_send');

            buttonElement.onclick = () => {
                const inputText = inputElement.value;
                if (!inputText.trim()) return alert("請輸入內容！");
                if (inputText.length < 50) return alert("您的解釋太短了（目前 " + inputText.length + " 字），請輸入至少 50 個字。");

                // 存入 RPG Maker 變數 87
                $gameVariables.setValue(targetVariableId, inputText);

                // 準備發送資料，並加上題號前綴
                const formattedText = questionId + "-" + inputText;
                const dataToSend = {
                    id: String(studentId),
                    se_text: formattedText,
                    time: new Date().toLocaleString()
                };

                // 初始設為 0 (失敗/處理中)
                $gameVariables.setValue(resultVariableId, 0);

                const maxRetries = 3;
                let attempt = 1;

                const sendWithRetry = () => {
                    const retryMsg = attempt > 1 ? ` (正在第 ${attempt} 次重試...)` : "";
                    $gameMessage.add("正在記錄..." + retryMsg);

                    fetch(backendUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dataToSend),
                    })
                        .then(response => {
                            if (response.ok) {
                                $gameVariables.setValue(resultVariableId, 1);
                                alert("紀錄成功！");
                                $gameMessage.add("記錄成功！");
                                finishProcess();
                            } else {
                                throw new Error('Server responded with status ' + response.status);
                            }
                        })
                        .catch((error) => {
                            console.error(`Logging error (Attempt ${attempt}):`, error);
                            if (attempt < maxRetries) {
                                attempt++;
                                // 等待 1 秒後重試
                                setTimeout(sendWithRetry, 1000);
                            } else {
                                alert("連線失敗！已嘗試 3 次均無法送達後端。請截圖輸入內容並聯繫老師。\n\n錯誤訊息：" + error.message);
                                $gameVariables.setValue(resultVariableId, 0);
                                $gameMessage.add("遠端紀錄失敗，但已存在本地變數。");
                                finishProcess();
                            }
                        });
                };

                const finishProcess = () => {
                    document.body.removeChild(container);
                    document.body.removeChild(backdrop);
                    interpreter.setWaitMode('');
                };

                // 開始第一次傳送
                sendWithRetry();
            };
        }
    };
})();