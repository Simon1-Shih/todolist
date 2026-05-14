import sys
from pathlib import Path

# 將專案根目錄加入 sys.path，使直接執行 wsgi.py 時能正確 import backend 套件
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from flask import Flask
from flask_cors import CORS
from backend.config import config
from backend.models import db
from backend.views import api_bp

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # 啟用 CORS，讓 React 前端 (port 3000) 能呼叫 Flask 後端 (port 5000)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # 初始化 SQLAlchemy
    db.init_app(app)

    # 註冊 API 藍圖
    app.register_blueprint(api_bp, url_prefix='/api')

    # 建立資料庫資料表
    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
