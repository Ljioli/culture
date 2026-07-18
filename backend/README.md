# WeCulture Web 管理后台

基于 React + Vite + Ant Design + CloudBase Web SDK。复用项目现有 `mcloud` 云函数和 `bx_` 集合，不另建数据库，不包含智能导览后台。

## 本地运行

```bash
npm install
npm run dev
```

默认地址：`http://127.0.0.1:5173`

## CloudBase 配置

复制 `.env.example` 为 `.env.local`，填写：

- `VITE_CLOUDBASE_ENV_ID`：云环境 ID。
- `VITE_CLOUDBASE_REGION`：环境地域。
- `VITE_CLOUDBASE_ACCESS_KEY`：可选，CloudBase Publishable Key，不得填写 SecretId/SecretKey。

登录前必须在 CloudBase 控制台完成这些配置：

- 登录授权：开启“匿名登录”。
- Web 安全域名：本地调试加入 `http://127.0.0.1:5173`、`http://localhost:5173`，正式部署后再加入静态网站托管分配的正式域名。
- 云函数调用权限：确认 `mcloud` 允许匿名/未登录 Web 身份调用。否则后台会提示 `PERMISSION_DENIED`，账号密码不会进入校验逻辑。

## 构建和部署

```bash
npm run build
```

将生成的 `dist` 目录上传到 CloudBase 静态网站托管即可。不要上传 `src`、`node_modules` 或项目根目录。也可以安装 CloudBase CLI 后执行：

```bash
tcb hosting deploy dist -e cloud1-d8g2l931c5a5311ea
```

同时需要重新上传项目中的 `cloudfunctions/mcloud` 云函数，使 Web 管理端身份兼容逻辑生效。微信开发者工具 CLI 可执行：

```bash
D:\weixin\微信web开发者工具\cli.bat cloud functions inc-deploy --env cloud1-d8g2l931c5a5311ea --name mcloud --file framework/core/application.js --project D:\by\weculture
```

## 初始管理员

项目初始化逻辑中的默认超级管理员是 `admin / 123456`。首次登录后请立即修改密码。
