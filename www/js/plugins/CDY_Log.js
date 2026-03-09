/*:
 * @plugindesc [v1.0] 聽力科學實驗行為追蹤插件 (支援 Vercel + Fly.io)
 * @author CDY
 *
 * @param backendUrl
 * @text Fly.io 後端網址
 * @desc 您的 Fly.io API 網址 (例如 https://your-app.fly.dev/api/log)
 * @type string
 * @default
 *
 * @param idVariable
 * @text 學號變數 ID
 * @desc 儲存學生學號的變數 ID (依照您的設定，請輸入 88)
 * @type number
 * @default 88
 *
 * @help
 * --- 如何使用 ---
 * 1. 在插件參數中填入您的 Fly.io Backend URL。
 * 2. 在事件中選擇「插件指令...」。
 * 3. 輸入以下指令來紀錄行為：
 * Log 行為代碼
 *
 * --- 範例 ---
 * Log C      (紀錄答對 Correct)
 * Log B      (紀錄觀看概念圖 Book)
 * Log SE_01  (紀錄第一個自我解釋節點)
 */

(function () {
    const parameters = PluginManager.parameters('CDY_Log');
    const backendUrl = String(parameters['backendUrl'] || '');
    const idVariable = parseInt(parameters['idVariable'] || 88);

    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (command === 'Log') {
            const actionCode = args[0] || 'Unknown';
            const studentId = $gameVariables.value(idVariable) || "Guest";

            // 取得時間
            const dt = new Date();
            const timestamp = (dt.getMonth() + 1) + '/' + dt.getDate() + ' ' +
                dt.getHours() + ':' + dt.getMinutes() + ':' + dt.getSeconds();

            const payload = {
                id: String(studentId),
                action: actionCode,
                time: timestamp
            };

            // 1. 本地備份 (LocalStorage)
            const storageKey = "Exp_Log_" + studentId;
            const localData = JSON.parse(localStorage.getItem(storageKey) || "[]");
            localData.push(payload);
            localStorage.setItem(storageKey, JSON.stringify(localData));

            // 2. 遠端傳送 (Fly.io)
            if (backendUrl) {
                fetch(backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                    .then(response => {
                        if (!response.ok) throw new Error();
                        console.log("Behavior Logged: " + actionCode);
                    })
                    .catch(error => {
                        console.warn("Remote log failed, saved to LocalStorage.");
                    });
            } else {
                console.error("CDY_Log: Backend URL is not set!");
            }
        }
    };
})();