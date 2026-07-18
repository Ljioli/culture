import { Component, useEffect, useMemo, useState } from 'react';
import {
  App as AntApp,
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  AppstoreOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DashboardOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExportOutlined,
  FileTextOutlined,
  HistoryOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoreOutlined,
  PictureOutlined,
  PlusOutlined,
  QrcodeOutlined,
  ReadOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  StarFilled,
  StarOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  callCloud,
  ENV_ID,
  getAdminSession,
  loginAdmin,
  setAdminSession,
  uploadFile,
} from './cloudbase';

const { Header, Content, Sider } = Layout;
const { TextArea } = Input;
const GUIDE_HISTORY_API = import.meta.env.VITE_GUIDE_HISTORY_API || 'http://127.0.0.1:5000/api/guide/history';

const NEWS_CATES = [{ value: '1', label: '公告' }, { value: '2', label: '服务' }];
const PRODUCT_CATES = ['线路', '吃喝', '住宿', '购物', '其他'].map((label, index) => ({ value: String(index + 1), label }));
const ACTIVITY_CATES = ['文旅活动', '旅行搭子', '体育活动', '读书活动', '亲子活动', '其他'].map((label, index) => ({ value: String(index + 1), label }));
const INFO_STATUS = { 0: '停止', 1: '正常' };
const USER_STATUS = { 0: '待审核', 1: '正常', 8: '未通过', 9: '禁用' };

const contentToText = (nodes) => Array.isArray(nodes)
  ? nodes.map((node) => node?.val || '').filter(Boolean).join('\n')
  : (nodes || '');
const textToContent = (text) => String(text || '').split(/\n+/).filter(Boolean).map((val) => ({ type: 'text', val }));
const getFormVal = (forms, mark, fallback = '') => (forms || []).find((item) => item.mark === mark)?.val ?? fallback;
const categoryName = (options, id) => options.find((item) => item.value === String(id))?.label || '';
const safeJson = (value) => {
  try { return JSON.stringify(value, null, 2); }
  catch { return String(value ?? ''); }
};
const statusTag = (enabled, yes = '启用', no = '停用') => <Tag color={Number(enabled) === 1 ? 'green' : 'default'}>{Number(enabled) === 1 ? yes : no}</Tag>;

function PageHead({ title, description, extra }) {
  return <div className="page-head"><div><h2>{title}</h2><p>{description}</p></div>{extra}</div>;
}

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidUpdate(prevProps) {
    if (prevProps.pageKey !== this.props.pageKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return <Alert type="error" showIcon message="页面加载失败" description={this.state.error.message || '当前模块发生异常，请刷新或切换菜单重试。'} />;
    }
    return this.props.children;
  }
}

function CloudImageUpload({ value = [], onChange, folder }) {
  const { message } = AntApp.useApp();
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const customRequest = async ({ file, onSuccess, onError }) => {
    try {
      const fileID = await uploadFile(file, folder);
      onChange?.([...list, fileID]);
      onSuccess({ fileID });
      message.success('图片已上传到云存储');
    } catch (error) {
      onError(error);
      message.error(error.message || '上传失败');
    }
  };
  return <div>
    <Upload customRequest={customRequest} showUploadList={false} accept="image/*">
      <Button icon={<UploadOutlined />}>上传图片</Button>
    </Upload>
    {list.length > 0 && <div style={{ marginTop: 8 }}>
      {list.map((item, index) => <Tag key={`${item}-${index}`} closable onClose={() => onChange?.(list.filter((_, i) => i !== index))}>图片 {index + 1}</Tag>)}
    </div>}
  </div>;
}

function ContentEditor({ value = [], onChange }) {
  const { message } = AntApp.useApp();
  const blocks = Array.isArray(value) ? value : [];
  const addTextBlock = () => onChange([...blocks, { type: 'text', val: '' }]);
  const addImageBlock = (fileID) => onChange([...blocks, { type: 'img', val: fileID }]);
  const updateBlock = (index, newVal) => {
    const next = [...blocks];
    next[index] = { ...next[index], val: newVal };
    onChange(next);
  };
  const removeBlock = (index) => onChange(blocks.filter((_, i) => i !== index));
  const moveBlock = (index, dir) => {
    const t = index + dir;
    if (t < 0 || t >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[t]] = [next[t], next[index]];
    onChange(next);
  };
  const textCnt = blocks.filter((b) => b.type === 'text').length;
  const imgCnt = blocks.filter((b) => b.type === 'img').length;
  return <div className="content-editor">
    {blocks.length === 0 && <div style={{ color: '#999', padding: '12px 0' }}>暂无内容，请添加文本或图片</div>}
    {blocks.map((block, index) => <div key={index} className="ce-block">
      <div className="ce-block-header">
        <Tag color={block.type === 'text' ? 'blue' : 'green'}>{block.type === 'text' ? '文本' : '图片'} {index + 1}</Tag>
        <Space size={2}>
          <Tooltip title="上移"><Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => moveBlock(index, -1)} /></Tooltip>
          <Tooltip title="下移"><Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={index === blocks.length - 1} onClick={() => moveBlock(index, 1)} /></Tooltip>
          <Tooltip title="删除"><Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeBlock(index)} /></Tooltip>
        </Space>
      </div>
      <div className="ce-block-body">
        {block.type === 'text'
          ? <TextArea value={block.val} onChange={(e) => updateBlock(index, e.target.value)} rows={3} placeholder="输入文本内容..." />
          : <div className="ce-img-wrap">
              {block.val && <img src={block.val} alt="" className="ce-img-preview" />}
              <CloudImageUpload
                value={block.val ? [block.val] : []}
                onChange={(list) => updateBlock(index, (list && list[0]) || '')}
                folder="content"
              />
            </div>}
      </div>
    </div>)}
    <Space style={{ marginTop: 8 }}>
      <Button icon={<FileTextOutlined />} onClick={addTextBlock}>添加文本</Button>
      <Upload
        customRequest={async ({ file, onSuccess, onError }) => {
          try {
            const fileID = await uploadFile(file, 'content');
            addImageBlock(fileID);
            onSuccess({ fileID });
          } catch (err) { onError(err); }
        }}
        showUploadList={false}
        accept="image/*"
      >
        <Button icon={<PictureOutlined />}>添加图片</Button>
      </Upload>
    </Space>
    {blocks.length > 0 && <div className="ce-summary">{textCnt} 段文字，{imgCnt} 张图片</div>}
  </div>;
}

function LoginPage() {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const submit = async (values) => {
    setLoading(true);
    setLoginError('');
    try {
      await loginAdmin(values.name.trim(), values.pwd);
      message.success('验证通过，欢迎进入管理后台');
    } catch (error) {
      const text = error.message || '登录失败';
      setLoginError(text);
      message.error(text);
    } finally { setLoading(false); }
  };
  return <div className="login-shell">
    <section className="login-visual">
      <div className="brand-mark">文</div>
      <div className="visual-copy">
        <h1>让文化被看见，<br />让旅程更有温度。</h1>
        <p>WeCulture 文旅数字化管理中心，统一管理用户、内容、攻略、活动、报名名单与社区游记，数据实时同步至微信小程序。</p>
      </div>
      <div className="visual-foot">CloudBase 云开发 · WeCulture Admin Console</div>
    </section>
    <section className="login-panel">
      <div className="login-card">
        <Tag color="orange" style={{ marginBottom: 18 }}>管理员身份验证</Tag>
        <h2>欢迎回来</h2>
        <div className="sub">请输入管理员账号与密码继续</div>
        {loginError && <Alert type="error" showIcon message="登录未完成" description={loginError} style={{ marginBottom: 18 }} />}
        <Form layout="vertical" size="large" onFinish={submit} initialValues={{ name: 'admin' }}>
          <Form.Item name="name" label="管理员账号" rules={[{ required: true, message: '请输入管理员账号' }, { min: 5 }]}>
            <Input prefix={<UserOutlined />} placeholder="管理员账号" autoComplete="username" />
          </Form.Item>
          <Form.Item name="pwd" label="登录密码" rules={[{ required: true, message: '请输入登录密码' }, { min: 5 }]}>
            <Input.Password prefix={<KeyOutlined />} placeholder="登录密码" autoComplete="current-password" />
          </Form.Item>
          <Button htmlType="submit" type="primary" block loading={loading}>验证并登录</Button>
        </Form>
        <div className="login-hint">初次初始化默认超级管理员为 <b>admin</b>，默认密码为 <b>123456</b>。登录后请立即在“账号安全”中修改密码。</div>
      </div>
    </section>
  </div>;
}

function Dashboard() {
  const { message } = AntApp.useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setData(await callCloud('admin/home') || []); }
    catch (error) { message.error(error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const icons = [<TeamOutlined />, <FileTextOutlined />, <CalendarOutlined />, <ReadOutlined />, <AppstoreOutlined />];
  const maxCnt = Math.max(1, ...data.map((item) => Number(item.cnt) || 0));
  const chartRows = data.length ? data : [{ title: '用户', cnt: 0 }, { title: '内容', cnt: 0 }, { title: '活动', cnt: 0 }, { title: '游记', cnt: 0 }];
  const trendPoints = chartRows.map((item, index) => {
    const x = chartRows.length === 1 ? 50 : (index / (chartRows.length - 1)) * 100;
    const y = 88 - (((Number(item.cnt) || 0) / maxCnt) * 68);
    return `${x},${y}`;
  }).join(' ');
  return <>
    <PageHead title="数据看板" description="实时掌握小程序内容与运营数据" extra={<Button icon={<ReloadOutlined />} onClick={load}>刷新数据</Button>} />
    <Card className="welcome-card" style={{ marginBottom: 20 }}>
      <h2>WeCulture 文旅运营中心</h2>
      <p>Web 后台已复用原小程序的 CloudBase 云函数和云数据库。这里的内容、状态与推荐设置会同步影响小程序展示。</p>
    </Card>
    <Spin spinning={loading}>
      <Row gutter={[16, 16]}>
        {data.map((item, index) => <Col span={Math.floor(24 / Math.max(data.length, 1))} key={item.title}>
          <Card className="metric-card"><Flex align="center" gap={14}><div className="metric-icon">{icons[index]}</div><div><div className="metric-label">{item.title}</div><div className="metric-value">{item.cnt || 0}</div></div></Flex></Card>
        </Col>)}
      </Row>
    </Spin>
    <Row gutter={[18, 18]} style={{ marginTop: 20 }}>
      <Col span={14}>
        <Card title="核心数据柱状图" className="content-card">
          <div className="bar-chart">
            {chartRows.map((item) => <div className="bar-item" key={item.title}>
              <div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(6, ((Number(item.cnt) || 0) / maxCnt) * 100)}%` }} /></div>
              <div className="bar-label">{item.title}</div>
              <div className="bar-value">{item.cnt || 0}</div>
            </div>)}
          </div>
        </Card>
      </Col>
      <Col span={10}>
        <Card title="运营趋势概览" className="content-card">
          <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={trendPoints} fill="none" stroke="#9a5b32" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {trendPoints.split(' ').map((point, index) => {
              const [cx, cy] = point.split(',');
              return <circle key={point + index} cx={cx} cy={cy} r="2.2" fill="#9a5b32" vectorEffect="non-scaling-stroke" />;
            })}
          </svg>
          <div className="trend-legend">{chartRows.map((item) => <span key={item.title}>{item.title}</span>)}</div>
        </Card>
      </Col>
    </Row>
    <Card title="当前后台覆盖范围" className="content-card" style={{ marginTop: 20 }}>
      <Flex gap={10} wrap>{['用户管理', '公告/服务', '旅行攻略', '活动与名单管理', '游记管理', '编辑关于我们', '小程序二维码', '系统管理员管理', '修改管理员密码', '管理员操作日志'].map((x) => <span className="module-chip" key={x}>{x}</span>)}</Flex>
      <Typography.Paragraph type="secondary" style={{ marginTop: 18, marginBottom: 0 }}>智能导览后台暂未纳入本期范围。</Typography.Paragraph>
    </Card>
  </>;
}

const resourceConfigs = {
  news: {
    title: '公告 / 服务', description: '管理小程序公告、服务内容、上下架、置顶与预览', list: 'admin/news_list', detail: 'admin/news_detail', insert: 'admin/news_insert', edit: 'admin/news_edit', remove: 'admin/news_del', status: 'admin/news_status', sort: 'admin/news_sort', vouch: 'admin/news_vouch',
    id: '_id', search: '搜索标题', columns: [
      { title: '标题', dataIndex: 'NEWS_TITLE', width: 240, ellipsis: true },
      { title: '分类', dataIndex: 'NEWS_CATE_NAME', width: 90 },
      { title: '排序号', dataIndex: 'NEWS_ORDER', width: 80, render: (v) => Number(v) === 0 ? <Tag color="blue">置顶</Tag> : v },
      { title: '状态', dataIndex: 'NEWS_STATUS', width: 80, render: (v) => statusTag(v) },
      { title: '首页推荐', dataIndex: 'NEWS_VOUCH', width: 100, render: (v) => Number(v) === 1 ? <Tag color="gold">首页推荐</Tag> : '-' },
      { title: '创建时间', dataIndex: 'NEWS_ADD_TIME', width: 160 },
    ],
    renderForm: () => <>
      <Form.Item name="title" label="标题" rules={[{ required: true, min: 4, max: 50 }]}><Input /></Form.Item>
      <Form.Item name="cateId" label="分类" rules={[{ required: true }]}><Select options={NEWS_CATES} /></Form.Item>
      <Form.Item name="order" label="排序"><InputNumber min={0} max={9999} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="cover" label="封面图"><CloudImageUpload folder="news" /></Form.Item>
      <Form.Item name="desc" label="简介" className="form-span-2" rules={[{ required: true, min: 10, max: 200 }]}><TextArea rows={3} /></Form.Item>
      <Form.Item name="content" label="正文（文本+图片混合）" className="form-span-2"><ContentEditor /></Form.Item>
    </>,
    normalize: (row) => ({ title: row.NEWS_TITLE, cateId: String(row.NEWS_CATE_ID), order: row.NEWS_ORDER, cover: getFormVal(row.NEWS_FORMS, 'cover', []), desc: row.NEWS_DESC || '', content: row.NEWS_CONTENT || [] }),
    build: (v) => ({ title: v.title, cateId: v.cateId, cateName: categoryName(NEWS_CATES, v.cateId), order: v.order ?? 9999, desc: v.desc, forms: v.cover?.length ? [{ mark: 'cover', title: '封面图片', type: 'image', val: v.cover }] : [] }),
    afterSave: async (id, values) => {
      if (values.content?.length) await callCloud('admin/news_update_content', { id, content: values.content });
    },
  },
  product: {
    title: '旅行攻略', description: '管理线路、吃喝、住宿、购物等旅行攻略', list: 'admin/product_list', detail: 'admin/product_detail', insert: 'admin/product_insert', edit: 'admin/product_edit', remove: 'admin/product_del', status: 'admin/product_status', vouch: 'admin/product_vouch', sort: 'admin/product_sort',
    id: '_id', search: '搜索攻略标题', columns: [
      { title: '标题', dataIndex: 'PRODUCT_TITLE', width: 240, ellipsis: true },
      { title: '分类', dataIndex: 'PRODUCT_CATE_NAME', width: 90 },
      { title: '排序号', dataIndex: 'PRODUCT_ORDER', width: 80, render: (v) => Number(v) === 0 ? <Tag color="blue">置顶</Tag> : v },
      { title: '状态', dataIndex: 'PRODUCT_STATUS', width: 80, render: (v) => statusTag(v) },
      { title: '首页推荐', dataIndex: 'PRODUCT_VOUCH', width: 100, render: (v) => Number(v) === 1 ? <Tag color="gold">首页推荐</Tag> : '-' },
      { title: '创建时间', dataIndex: 'PRODUCT_ADD_TIME', width: 160 },
    ],
    renderForm: () => <>
      <Form.Item name="title" label="标题" rules={[{ required: true, min: 2, max: 50 }]}><Input /></Form.Item>
      <Form.Item name="cateId" label="分类" rules={[{ required: true }]}><Select options={PRODUCT_CATES} /></Form.Item>
      <Form.Item name="order" label="排序"><InputNumber min={0} max={9999} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="cover" label="封面图"><CloudImageUpload folder="product" /></Form.Item>
      <Form.Item name="desc" label="简介" className="form-span-2" rules={[{ required: true, max: 100 }]}><TextArea rows={3} /></Form.Item>
      <Form.Item name="content" label="攻略详情（文本+图片混合）" className="form-span-2" rules={[{ required: true }]}><ContentEditor /></Form.Item>
    </>,
    normalize: (row) => ({ title: row.PRODUCT_TITLE, cateId: String(row.PRODUCT_CATE_ID), order: row.PRODUCT_ORDER, cover: getFormVal(row.PRODUCT_FORMS, 'cover', []), desc: getFormVal(row.PRODUCT_FORMS, 'desc'), content: getFormVal(row.PRODUCT_FORMS, 'content', []) }),
    build: (v) => ({ title: v.title, cateId: v.cateId, cateName: categoryName(PRODUCT_CATES, v.cateId), order: v.order ?? 9999, forms: [
      { mark: 'cover', title: '封面图片', type: 'image', val: v.cover || [] },
      { mark: 'desc', title: '简介', type: 'textarea', val: v.desc },
      { mark: 'content', title: '详情', type: 'content', val: v.content || [] },
    ] }),
  },
  activity: {
    title: '活动与名单管理', description: '管理活动发布、报名名单、核销签到、置顶和首页推荐', list: 'admin/activity_list', detail: 'admin/activity_detail', insert: 'admin/activity_insert', edit: 'admin/activity_edit', remove: 'admin/activity_del', status: 'admin/activity_status', vouch: 'admin/activity_vouch', sort: 'admin/activity_sort',
    id: '_id', search: '搜索活动标题', columns: [
      { title: '活动', dataIndex: 'ACTIVITY_TITLE', width: 200, ellipsis: true },
      { title: '分类', dataIndex: 'ACTIVITY_CATE_NAME', width: 80 },
      { title: '报名状态', dataIndex: 'statusDesc', width: 90 },
      { title: '开始时间', dataIndex: 'ACTIVITY_START', width: 140 },
      { title: '报名', width: 80, render: (_, r) => `${r.ACTIVITY_JOIN_CNT || 0}/${r.ACTIVITY_MAX_CNT || '不限'}` },
      { title: '排序', dataIndex: 'ACTIVITY_ORDER', width: 70, render: (v) => Number(v) === 0 ? <Tag color="blue">置顶</Tag> : v },
      { title: '状态', dataIndex: 'ACTIVITY_STATUS', width: 70, render: (v) => statusTag(v) },
      { title: '推荐', dataIndex: 'ACTIVITY_VOUCH', width: 80, render: (v) => Number(v) === 1 ? <Tag color="gold">首页</Tag> : '-' },
    ],
    renderForm: () => <>
      <Form.Item name="formTitle" label="活动标题" rules={[{ required: true, min: 2, max: 50 }]}><Input /></Form.Item>
      <Form.Item name="cateId" label="分类" rules={[{ required: true }]}><Select options={ACTIVITY_CATES} /></Form.Item>
      <Form.Item name="formStart" label="开始时间"><DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="formEnd" label="结束时间"><DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="formStop" label="报名截止" rules={[{ required: true }]}><DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="formMaxCnt" label="人数上限"><InputNumber min={0} max={9999} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="formAddress" label="活动地址" className="form-span-2"><Input /></Form.Item>
      <Form.Item name="cover" label="活动封面"><CloudImageUpload folder="activity" /></Form.Item>
      <Form.Item name="fee" label="活动费用"><Input /></Form.Item>
      <Form.Item name="time" label="预计时长（小时）"><Input /></Form.Item>
      <Form.Item name="formOrder" label="排序"><InputNumber min={0} max={9999} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="formCancelSet" label="取消规则"><Select options={[{value:0,label:'不可取消'},{value:1,label:'允许取消'},{value:2,label:'截止前可取消'}]} /></Form.Item>
      <Form.Item name="formCheckSet" label="报名审核"><Select options={[{value:0,label:'无需审核'},{value:1,label:'需要审核'}]} /></Form.Item>
      <Form.Item name="desc" label="活动内容（文本+图片混合）" className="form-span-2" rules={[{ required: true }]}><ContentEditor /></Form.Item>
    </>,
    normalize: (r) => ({ formTitle: r.ACTIVITY_TITLE, cateId: String(r.ACTIVITY_CATE_ID), formStart: r.ACTIVITY_START ? dayjs(r.ACTIVITY_START) : null, formEnd: r.ACTIVITY_END ? dayjs(r.ACTIVITY_END) : null, formStop: r.ACTIVITY_STOP ? dayjs(r.ACTIVITY_STOP) : null, formAddress: r.ACTIVITY_ADDRESS, formMaxCnt: r.ACTIVITY_MAX_CNT, formOrder: r.ACTIVITY_ORDER, formCancelSet: r.ACTIVITY_CANCEL_SET, formCheckSet: r.ACTIVITY_CHECK_SET, cover: getFormVal(r.ACTIVITY_FORMS, 'cover', []), fee: getFormVal(r.ACTIVITY_FORMS, 'fee'), time: getFormVal(r.ACTIVITY_FORMS, 'time'), desc: getFormVal(r.ACTIVITY_FORMS, 'desc', []) }),
    defaults: { formMaxCnt: 20, formOrder: 9999, formCancelSet: 1, formCheckSet: 0, formStop: dayjs().add(7, 'day') },
    build: (v) => ({ formTitle: v.formTitle, cateId: v.cateId, cateName: categoryName(ACTIVITY_CATES, v.cateId), formStart: v.formStart?.format('YYYY-MM-DD HH:mm') || '', formEnd: v.formEnd?.format('YYYY-MM-DD HH:mm') || '', formStop: v.formStop?.format('YYYY-MM-DD HH:mm'), formAddress: v.formAddress || '', formAddressGeo: {}, formMaxCnt: v.formMaxCnt ?? 20, formCancelSet: v.formCancelSet ?? 1, formCheckSet: v.formCheckSet ?? 0, formIsMenu: 1, formOrder: v.formOrder ?? 9999, joinForms: [{ mark: 'name', type: 'text', title: '姓名', must: true, max: 30 }, { mark: 'phone', type: 'mobile', title: '手机', must: true, edit: false }], forms: [
      { mark: 'cover', title: '活动封面', type: 'image', val: v.cover || [] },
      { mark: 'desc', title: '活动内容', type: 'content', val: v.desc || [] },
      { mark: 'fee', title: '活动费用', type: 'text', val: v.fee || '' },
      { mark: 'time', title: '预计时长(小时)', type: 'digit', val: v.time || '' },
    ] }),
  },
};

function ManagedResource({ type }) {
  const cfg = resourceConfigs[type];
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const data = await callCloud(cfg.list, { page: targetPage, size: 12, isTotal: true, search: search || undefined });
      setRows(data?.list || []); setTotal(data?.total || 0); setPage(targetPage);
    } catch (error) { message.error(error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(1); }, [type]);
  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue(cfg.defaults || { order: 9999 }); setModalOpen(true); };
  const openEdit = async (row) => {
    setLoading(true);
    try {
      const detail = await callCloud(cfg.detail, { id: row[cfg.id] });
      setEditing(row); form.resetFields(); form.setFieldsValue(cfg.normalize(detail || row)); setModalOpen(true);
    } catch (error) { message.error(error.message); }
    finally { setLoading(false); }
  };
  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = cfg.build(values);
      let id = editing?.[cfg.id];
      if (editing) await callCloud(cfg.edit, { ...payload, id });
      else {
        const created = await callCloud(cfg.insert, payload);
        id = created?.id || created?._id || created;
      }
      if (cfg.afterSave && id) await cfg.afterSave(id, values);
      message.success(editing ? '修改成功' : '添加成功'); setModalOpen(false); load(editing ? page : 1);
    } catch (error) { message.error(error.message); }
    finally { setSaving(false); }
  };
  const action = async (route, params, success = '操作成功') => {
    try { await callCloud(route, params); message.success(success); load(); }
    catch (error) { message.error(error.message); }
  };
  const actW = type === 'activity' ? 310 : cfg.sort && cfg.vouch ? 310 : cfg.sort || cfg.vouch ? 280 : 220;
  const columns = [...cfg.columns, {
    title: '操作', fixed: 'right', width: actW, render: (_, row) => {
      const id = row[cfg.id];
      const prefix = type === 'news' ? 'NEWS' : type === 'product' ? 'PRODUCT' : 'ACTIVITY';
      const enabled = row[`${prefix}_STATUS`]; const vouched = row[`${prefix}_VOUCH`]; const order = row[`${prefix}_ORDER`];
      return <Space size={2}>
        <Tooltip title="编辑"><Button type="text" icon={<EditOutlined />} onClick={() => openEdit(row)} /></Tooltip>
        {type === 'activity' && <Button size="small" onClick={() => { goPage('joins'); window.setTimeout(() => window.dispatchEvent(new CustomEvent('weculture-open-activity-joins', { detail: { id } })), 80); }}>名单</Button>}
        <Button size="small" onClick={() => action(cfg.status, { id, status: Number(enabled) === 1 ? 0 : 1 })}>{Number(enabled) === 1 ? '停用' : '启用'}</Button>
        {cfg.sort && <Button size="small" onClick={() => action(cfg.sort, { id, sort: Number(order) === 0 ? 9999 : 0 })}>{Number(order) === 0 ? '去置顶' : '置顶'}</Button>}
        {cfg.vouch && <Button size="small" icon={Number(vouched) === 1 ? <StarFilled /> : <StarOutlined />} onClick={() => action(cfg.vouch, { id, vouch: Number(vouched) === 1 ? 0 : 1 })}>{Number(vouched) === 1 ? '去推荐' : '推荐'}</Button>}
        <Popconfirm title={`确认删除“${row[`${prefix}_TITLE`]}”？`} onConfirm={() => action(cfg.remove, { id }, '删除成功')}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>
      </Space>;
    },
  }];
  return <>
    <PageHead title={cfg.title} description={cfg.description} extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增{cfg.title.replace('管理','')}</Button>} />
    <Card className="content-card">
      <div className="toolbar"><div className="toolbar-left"><Input allowClear value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={() => load(1)} prefix={<SearchOutlined />} placeholder={cfg.search} style={{ width: 280 }} /><Button onClick={() => load(1)}>查询</Button></div><Button icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button></div>
      <Table rowKey={cfg.id} loading={loading} columns={columns} dataSource={rows} scroll={{ x: 1050 }} pagination={{ current: page, pageSize: 12, total, showTotal: (n) => `共 ${n} 条`, onChange: load }} />
    </Card>
    <Modal title={editing ? `编辑${cfg.title}` : `新增${cfg.title}`} width={760} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={save} confirmLoading={saving} destroyOnHidden>
      <Form form={form} layout="vertical" className="form-grid">{cfg.renderForm()}</Form>
    </Modal>
  </>;
}

function ReviewList({ kind }) {
  const isUser = kind === 'user';
  const { message } = AntApp.useApp();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(false); const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [detail, setDetail] = useState(null);
  const [exportUrl, setExportUrl] = useState(''); const [exportLoading, setExportLoading] = useState(false);
  const load = async (p = page) => { setLoading(true); try { const data = await callCloud(isUser ? 'admin/user_list' : 'admin/info_list', { page: p, size: 12, isTotal: true, search: search || undefined }); setRows(data?.list || []); setTotal(data?.total || 0); setPage(p); } catch(e){ message.error(e.message); } finally{ setLoading(false); } };
  useEffect(() => { load(1); }, [kind]);
  const act = async (route, params) => { try { await callCloud(route, params); message.success('操作成功'); load(); } catch(e){ message.error(e.message); } };
  const showDetail = async (row) => { try { setDetail(await callCloud(isUser ? 'admin/user_detail' : 'admin/info_detail', { id: isUser ? row.USER_MINI_OPENID : row._id })); } catch(e){ message.error(e.message); } };
  const doExport = async () => {
    setExportLoading(true);
    try {
      const data = await callCloud('admin/user_data_export', { condition: search || '', fields: [] });
      setExportUrl(data?.url || data || '');
      message.success('导出完成');
    } catch (e) { message.error(e.message || '导出失败'); }
    finally { setExportLoading(false); }
  };
  const picUrl = (id) => id ? `https://${ENV_ID.toLowerCase()}.tcb.qcloud.la/${id}` : '';
  const renderDetail = () => {
    if (!detail) return null;
    if (isUser) {
      const ud = detail.userData || {};
      const udCounts = ud.counts || {};
      const favList = ud.favList || []; const joinList = ud.joinList || []; const infoList = ud.infoList || []; const historyList = ud.historyList || [];
      const userItems = [
        { key: 'nick', label: '昵称', children: <Space><Avatar src={detail.USER_PIC} icon={<UserOutlined />} />{detail.USER_NAME || '未设置昵称'}</Space> },
        { key: 'mobile', label: '手机', children: detail.USER_MOBILE || '-' },
        { key: 'gender', label: '性别', children: detail.USER_OBJ?.sex || '-' },
        { key: 'status', label: '状态', children: <Tag color={Number(detail.USER_STATUS) === 1 ? 'green' : Number(detail.USER_STATUS) === 9 ? 'red' : 'orange'}>{USER_STATUS[detail.USER_STATUS] || detail.USER_STATUS}</Tag> },
        { key: 'loginCnt', label: '登录次数', children: detail.USER_LOGIN_CNT || 0 },
        { key: 'lastLogin', label: '最近登录', children: detail.USER_LOGIN_TIME || '-' },
        { key: 'regTime', label: '注册时间', children: detail.USER_ADD_TIME || '-' },
        { key: 'openid', label: 'OpenID', children: <Typography.Text copyable style={{ fontSize: 12 }}>{detail.USER_MINI_OPENID || '-'}</Typography.Text> },
      ];
      return <>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col span={6}><Card size="small"><Statistic title="收藏" value={udCounts.favCount || 0} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="报名" value={udCounts.joinCount || 0} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="游记" value={udCounts.infoCount || 0} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="浏览记录" value={udCounts.historyCount || 0} /></Card></Col>
        </Row>
        <Descriptions bordered column={1} size="small" items={userItems} />
        <Card size="small" style={{ marginTop: 16 }}><Tabs items={[
          { key: 'fav', label: `收藏 (${favList.length})`, children: favList.length ? <Table rowKey="_id" size="small" dataSource={favList} columns={[
            { title: '名称', dataIndex: 'title', width: 200 },
            { title: '类型', dataIndex: 'typeName', width: 100 },
            { title: '时间', dataIndex: 'addTime', width: 160 },
          ]} pagination={false} /> : <Empty description="暂无收藏" /> },
          { key: 'join', label: `报名 (${joinList.length})`, children: joinList.length ? <Table rowKey="_id" size="small" dataSource={joinList} columns={[
            { title: '活动', dataIndex: 'activityTitle', width: 200 },
            { title: '状态', dataIndex: 'statusDesc', width: 100 },
            { title: '报名时间', dataIndex: 'addTime', width: 160 },
          ]} pagination={false} /> : <Empty description="暂无报名" /> },
          { key: 'info', label: `游记 (${infoList.length})`, children: infoList.length ? <Table rowKey="_id" size="small" dataSource={infoList} columns={[
            { title: '标题', dataIndex: 'title', width: 200 },
            { title: '时间', dataIndex: 'addTime', width: 160 },
          ]} pagination={false} /> : <Empty description="暂无游记" /> },
          { key: 'history', label: `浏览历史 (${historyList.length})`, children: historyList.length ? <Table rowKey="_id" size="small" dataSource={historyList} columns={[
            { title: '内容', dataIndex: 'title', width: 200 },
            { title: '类型', dataIndex: 'typeName', width: 100 },
            { title: '时间', dataIndex: 'addTime', width: 160 },
          ]} pagination={false} /> : <Empty description="暂无浏览记录" /> },
        ]} /></Card>
      </>;
    }
    const infoItems = [
      { key: 'title', label: '标题', children: detail.INFO_OBJ?.title || '未命名游记' },
      { key: 'cate', label: '分类', children: detail.INFO_CATE_NAME || '-' },
      { key: 'user', label: '用户', children: detail.user?.USER_NAME || detail.INFO_USER_ID || '匿名用户' },
      { key: 'comments', label: '评论数', children: detail.INFO_COMMENT_CNT || 0 },
      { key: 'status', label: '状态', children: <Tag color={Number(detail.INFO_STATUS) === 1 ? 'green' : 'red'}>{INFO_STATUS[detail.INFO_STATUS] || detail.INFO_STATUS}</Tag> },
      { key: 'sort', label: '排序', children: Number(detail.INFO_ORDER) === 0 ? '置顶' : detail.INFO_ORDER },
      { key: 'vouch', label: '首页推荐', children: Number(detail.INFO_VOUCH) === 1 ? '是' : '否' },
      { key: 'time', label: '提交时间', children: detail.INFO_ADD_TIME || '-' },
    ];
    return <>
      <Descriptions bordered column={1} size="small" items={infoItems} />
      <Card title="游记表单内容" size="small" style={{ marginTop: 14 }}>
        <pre className="json-preview">{safeJson(detail.INFO_FORMS || detail.INFO_OBJ || {})}</pre>
      </Card>
    </>;
  };
  const columns = isUser ? [
    { title:'用户', width:200, render:(_,r)=><Space><Avatar src={r.USER_PIC} icon={<UserOutlined/>} size="small"/><Typography.Text ellipsis style={{maxWidth:130}}>{r.USER_NAME || '未设置昵称'}</Typography.Text></Space> },
    { title:'手机', dataIndex:'USER_MOBILE', width:120, ellipsis:true, render:(v)=>v||'-' },
    { title:'状态', dataIndex:'USER_STATUS', width:90, render:(v)=><Tag color={Number(v)===1?'green':Number(v)===9?'red':'orange'} style={{margin:0}}>{USER_STATUS[v] || v}</Tag> },
    { title:'登录', dataIndex:'USER_LOGIN_CNT', width:60 },
    { title:'最近登录', dataIndex:'USER_LOGIN_TIME', width:160, ellipsis:true },
    { title:'注册时间', dataIndex:'USER_ADD_TIME', width:160, ellipsis:true },
    { title:'操作', width:220, render:(_,r)=><Space size={2}>
      <Button size="small" onClick={()=>showDetail(r)}>详情</Button>
      {Number(r.USER_STATUS)===0&&<Button size="small" onClick={()=>act('admin/user_status',{id:r.USER_MINI_OPENID,status:1,reason:''})}>通过</Button>}
      {Number(r.USER_STATUS)===9?<Button size="small" onClick={()=>act('admin/user_status',{id:r.USER_MINI_OPENID,status:1,reason:''})}>恢复</Button>:<Button size="small" onClick={()=>act('admin/user_status',{id:r.USER_MINI_OPENID,status:9,reason:'后台禁用'})}>禁用</Button>}
      <Popconfirm title="确认删除该用户及关联数据？" onConfirm={()=>act('admin/user_del',{id:r.USER_MINI_OPENID})}><Button size="small" danger icon={<DeleteOutlined/>}/></Popconfirm>
    </Space> },
  ] : [
    { title:'游记标题', width:240, ellipsis:true, render:(_,r)=><div><Typography.Text ellipsis style={{maxWidth:220}}>{r.INFO_OBJ?.title || '未命名游记'}</Typography.Text><div style={{color:'#999',fontSize:11}}>{r.user?.USER_NAME || '匿名用户'}</div></div> },
    { title:'分类', dataIndex:'INFO_CATE_NAME', width:80 },
    { title:'状态', dataIndex:'INFO_STATUS', width:70, render:(v)=><Tag color={Number(v)===1?'green':'red'} style={{margin:0}}>{INFO_STATUS[v] || v}</Tag> },
    { title:'评论', dataIndex:'INFO_COMMENT_CNT', width:60 },
    { title:'排序', dataIndex:'INFO_ORDER', width:70, render:(v)=>Number(v)===0?<Tag color="blue" style={{margin:0}}>置顶</Tag>:v },
    { title:'推荐', dataIndex:'INFO_VOUCH', width:70, render:(v)=>Number(v)===1?<Tag color="gold" style={{margin:0}}>首页</Tag>:'-' },
    { title:'提交时间', dataIndex:'INFO_ADD_TIME', width:155, ellipsis:true },
    { title:'操作', width:300, render:(_,r)=><Space size={2}>
      <Button size="small" onClick={()=>showDetail(r)}>详情</Button>
      <Button size="small" onClick={()=>act('admin/info_status',{id:r._id,status:Number(r.INFO_STATUS)===1?0:1})}>{Number(r.INFO_STATUS)===1?'停用':'启用'}</Button>
      <Button size="small" onClick={()=>act('admin/info_sort',{id:r._id,sort:Number(r.INFO_ORDER)===0?9999:0})}>{Number(r.INFO_ORDER)===0?'去置顶':'置顶'}</Button>
      <Button size="small" icon={Number(r.INFO_VOUCH)===1?<StarFilled/>:<StarOutlined/>} onClick={()=>act('admin/info_vouch',{id:r._id,vouch:Number(r.INFO_VOUCH)===1?0:1})}>{Number(r.INFO_VOUCH)===1?'去推荐':'推荐'}</Button>
      <Popconfirm title="确认删除？删除不可恢复" onConfirm={()=>act('admin/info_del',{id:r._id})}><Button size="small" danger icon={<DeleteOutlined/>}/></Popconfirm>
    </Space> },
  ];
  return <><PageHead title={isUser?'用户管理':'游记管理'} description={isUser?'查看注册用户、审核状态与用户行为数据':'管理用户发布的游记、展示状态、置顶与首页推荐'} extra={isUser ? <Space><Button icon={<ExportOutlined />} loading={exportLoading} onClick={doExport}>导出</Button>{exportUrl && <a href={exportUrl} target="_blank" rel="noreferrer"><Button icon={<DownloadOutlined />}>下载导出文件</Button></a>}</Space> : undefined} /><Card className="content-card"><div className="toolbar"><div className="toolbar-left"><Input value={search} onChange={e=>setSearch(e.target.value)} onPressEnter={()=>load(1)} allowClear prefix={<SearchOutlined/>} placeholder={isUser?'昵称、手机号':'搜索'} style={{width:260}}/><Button onClick={()=>load(1)}>查询</Button></div><Button icon={<ReloadOutlined/>} onClick={()=>load()}>刷新</Button></div><Table rowKey={isUser?'USER_MINI_OPENID':'_id'} loading={loading} dataSource={rows} columns={columns} scroll={{x:isUser?1050:1180}} pagination={{current:page,pageSize:12,total,onChange:load,showTotal:n=>`共 ${n} 条`}}/></Card><Drawer title={isUser?'用户详情':'游记详情'} width={780} open={!!detail} onClose={()=>setDetail(null)} destroyOnHidden>{renderDetail()}</Drawer></>;
}

function JoinManagement() {
  const { message } = AntApp.useApp(); const [activities,setActivities]=useState([]); const [activityId,setActivityId]=useState(); const [rows,setRows]=useState([]); const [loading,setLoading]=useState(false);
  const [exportUrl, setExportUrl]=useState(''); const [exportLoading,setExportLoading]=useState(false);
  const loadActivities=async()=>{try{const d=await callCloud('admin/activity_list',{page:1,size:100,isTotal:false});setActivities((d?.list||[]).map(x=>({value:x._id,label:x.ACTIVITY_TITLE})));if(!activityId&&d?.list?.[0])setActivityId(d.list[0]._id);}catch(e){message.error(e.message)}};
  const load=async()=>{if(!activityId)return;setLoading(true);try{const d=await callCloud('admin/activity_join_list',{activityId,page:1,size:100,isTotal:true});setRows(d?.list||[]);}catch(e){message.error(e.message)}finally{setLoading(false)}};
  useEffect(()=>{loadActivities()},[]); useEffect(()=>{load()},[activityId]);
  useEffect(()=>{const onOpen=(event)=>{if(event.detail?.id)setActivityId(event.detail.id)};window.addEventListener('weculture-open-activity-joins',onOpen);return()=>window.removeEventListener('weculture-open-activity-joins',onOpen)},[]);
  const act=async(route,params)=>{try{await callCloud(route,params);message.success('操作成功');load()}catch(e){message.error(e.message)}};
  const doExport=async()=>{if(!activityId)return;setExportLoading(true);try{const data=await callCloud('admin/activity_join_data_export',{activityId,status:1});setExportUrl(data?.url||data||'');message.success('导出完成');}catch(e){message.error(e.message||'导出失败')}finally{setExportLoading(false)}};
  const copyInfo=async(r)=>{const info=[`活动报名信息`, `姓名：${r.user?.USER_NAME||r.ACTIVITY_JOIN_OBJ?.name||'-'}`, `电话：${r.ACTIVITY_JOIN_OBJ?.phone||'-'}`, `核验码：${r.ACTIVITY_JOIN_CODE||'-'}`, `状态：${Number(r.ACTIVITY_JOIN_STATUS)===1?'成功':Number(r.ACTIVITY_JOIN_STATUS)===0?'待审核':'未通过'}`, `签到：${Number(r.ACTIVITY_JOIN_IS_CHECKIN)===1?'已签到':'未签到'}`, `报名时间：${r.ACTIVITY_JOIN_ADD_TIME||'-'}`].join('\n');try{await navigator.clipboard.writeText(info);message.success('已复制到剪贴板')}catch{message.error('复制失败')}};
  const columns=[{title:'报名人',width:130,render:(_,r)=>r.user?.USER_NAME||r.ACTIVITY_JOIN_OBJ?.name||'匿名用户'},{title:'电话',width:110,render:(_,r)=>r.ACTIVITY_JOIN_OBJ?.phone||'-'},{title:'核验码',dataIndex:'ACTIVITY_JOIN_CODE',width:150,ellipsis:true},{title:'报名状态',dataIndex:'ACTIVITY_JOIN_STATUS',width:90,render:v=><Tag color={Number(v)===1?'green':Number(v)===0?'orange':'red'} style={{margin:0}}>{Number(v)===1?'成功':Number(v)===0?'待审核':'未通过'}</Tag>},{title:'签到',dataIndex:'ACTIVITY_JOIN_IS_CHECKIN',width:70,render:v=>statusTag(v,'已签到','未签到')},{title:'报名时间',dataIndex:'ACTIVITY_JOIN_ADD_TIME',width:155,ellipsis:true},{title:'操作',width:230,render:(_,r)=><Space size={2}>
    <Tooltip title="复制报名信息"><Button size="small" icon={<CopyOutlined/>} onClick={()=>copyInfo(r)} /></Tooltip>
    <Button size="small" onClick={()=>act('admin/activity_join_status',{activityJoinId:r._id,status:1,reason:''})}>通过</Button>
    <Button size="small" onClick={()=>act('admin/activity_join_checkin',{activityJoinId:r._id,flag:Number(r.ACTIVITY_JOIN_IS_CHECKIN)===1?0:1})}>{Number(r.ACTIVITY_JOIN_IS_CHECKIN)===1?'取消签到':'签到'}</Button>
    <Popconfirm title="删除这条报名记录？" onConfirm={()=>act('admin/activity_join_del',{activityJoinId:r._id})}><Button size="small" danger icon={<DeleteOutlined/>}/></Popconfirm>
  </Space>}];
  return <><PageHead title="报名名单管理" description="对应小程序端活动名单管理，可审核报名、现场核验签到与维护名单" extra={<Space>{exportUrl ? <a href={exportUrl} target="_blank" rel="noreferrer"><Button icon={<DownloadOutlined/>}>下载导出</Button></a> : <Button icon={<ExportOutlined/>} loading={exportLoading} onClick={doExport} disabled={!activityId}>导出名单</Button>}</Space>}/><Card className="content-card"><div className="toolbar"><Select showSearch optionFilterProp="label" value={activityId} onChange={setActivityId} options={activities} placeholder="请选择活动" style={{width:340}}/><Button icon={<ReloadOutlined/>} onClick={load}>刷新名单</Button></div>{activityId?<Table rowKey="_id" loading={loading} dataSource={rows} columns={columns} scroll={{x:1050}}/>:<Empty description="暂无活动"/>}</Card></>;
}

function AdminManagement() {
  const { message }=AntApp.useApp(); const [form]=Form.useForm(); const [rows,setRows]=useState([]); const [loading,setLoading]=useState(false); const [open,setOpen]=useState(false); const [editing,setEditing]=useState(null);
  const load=async()=>{setLoading(true);try{const d=await callCloud('admin/mgr_list',{page:1,size:100,isTotal:true});setRows(d?.list||[])}catch(e){message.error(e.message)}finally{setLoading(false)}}; useEffect(()=>{load()},[]);
  const save=async()=>{try{const v=await form.validateFields();await callCloud(editing?'admin/mgr_edit':'admin/mgr_insert',{...v,id:editing?._id});message.success('保存成功');setOpen(false);load()}catch(e){if(e?.errorFields)return;message.error(e.message)}};
  const act=async(route,params)=>{try{await callCloud(route,params);message.success('操作成功');load()}catch(e){message.error(e.message)}};
  const edit=async(r)=>{try{const d=await callCloud('admin/mgr_detail',{id:r._id});setEditing(r);form.setFieldsValue({name:d.ADMIN_NAME,desc:d.ADMIN_DESC,phone:d.ADMIN_PHONE});setOpen(true)}catch(e){message.error(e.message)}};
  const columns=[{title:'账号',dataIndex:'ADMIN_NAME'},{title:'姓名',dataIndex:'ADMIN_DESC'},{title:'手机',dataIndex:'ADMIN_PHONE'},{title:'角色',dataIndex:'ADMIN_TYPE',render:v=><Tag color={Number(v)===1?'gold':'blue'}>{Number(v)===1?'超级管理员':'普通管理员'}</Tag>},{title:'状态',dataIndex:'ADMIN_STATUS',render:(v)=>statusTag(v)},{title:'登录次数',dataIndex:'ADMIN_LOGIN_CNT'},{title:'最后登录',dataIndex:'ADMIN_LOGIN_TIME'},{title:'操作',render:(_,r)=><Space><Button type="link" onClick={()=>edit(r)}>编辑</Button><Switch checked={Number(r.ADMIN_STATUS)===1} onChange={(checked)=>act('admin/mgr_status',{id:r._id,status:checked?1:0})}/><Popconfirm title="删除该管理员？" onConfirm={()=>act('admin/mgr_del',{id:r._id})}><Button danger type="text" icon={<DeleteOutlined/>}/></Popconfirm></Space>}];
  return <><PageHead title="管理员管理" description="仅超级管理员可新增、编辑和停用后台账号" extra={<Button type="primary" icon={<PlusOutlined/>} onClick={()=>{setEditing(null);form.resetFields();setOpen(true)}}>新增管理员</Button>}/><Card className="content-card"><Table rowKey="_id" loading={loading} dataSource={rows} columns={columns}/></Card><Modal open={open} title={editing?'编辑管理员':'新增管理员'} onCancel={()=>setOpen(false)} onOk={save}><Form form={form} layout="vertical"><Form.Item name="name" label="账号" rules={[{required:true,min:5,max:30}]}><Input/></Form.Item><Form.Item name="desc" label="姓名" rules={[{required:true,max:30}]}><Input/></Form.Item><Form.Item name="phone" label="手机"><Input maxLength={11}/></Form.Item><Form.Item name="password" label={editing?'新密码（留空不修改）':'初始密码'} rules={editing?[]:[{required:true,min:6}]}><Input.Password/></Form.Item></Form></Modal></>;
}

function Logs() {
  const {message}=AntApp.useApp();const [rows,setRows]=useState([]);const [loading,setLoading]=useState(false);const [search,setSearch]=useState('');
  const load=async()=>{setLoading(true);try{const d=await callCloud('admin/log_list',{page:1,size:100,isTotal:true,search:search||undefined});setRows(d?.list||[])}catch(e){message.error(e.message)}finally{setLoading(false)}};useEffect(()=>{load()},[]);
  return <><PageHead title="操作日志" description="追踪管理员登录与内容维护行为" extra={<Popconfirm title="确认清空全部操作日志？" onConfirm={async()=>{try{await callCloud('admin/log_clear');message.success('日志已清空');load()}catch(e){message.error(e.message)}}}><Button danger>清空日志</Button></Popconfirm>}/><Card className="content-card"><div className="toolbar"><Input value={search} onChange={e=>setSearch(e.target.value)} onPressEnter={load} prefix={<SearchOutlined/>} placeholder="内容、账号、姓名" style={{width:300}}/><Button icon={<ReloadOutlined/>} onClick={load}>刷新</Button></div><Table rowKey="_id" loading={loading} dataSource={rows} columns={[{title:'时间',dataIndex:'LOG_ADD_TIME',width:170},{title:'管理员',width:180,render:(_,r)=>`${r.LOG_ADMIN_DESC||''}（${r.LOG_ADMIN_NAME||'-'}）`},{title:'类型',dataIndex:'LOG_TYPE_DESC',width:100},{title:'内容',dataIndex:'LOG_CONTENT'}]}/></Card></>;
}

function GuideChatLogs() {
  const { message } = AntApp.useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [connected, setConnected] = useState(true);

  const load = async (nextLimit = limit) => {
    setLoading(true);
    try {
      const response = await fetch(`${GUIDE_HISTORY_API}?limit=${nextLimit}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.code !== 0) throw new Error(result.msg || '获取问答记录失败');
      setRows(result.data?.list || []);
      setConnected(true);
    } catch (error) {
      setRows([]);
      setConnected(false);
      message.error(error.message || '智能导览记录加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(limit); }, []);

  const hitModeTag = (value) => {
    if (value === 'knowledge') return <Tag color="green">知识库命中</Tag>;
    if (value === 'ai_fallback') return <Tag color="blue">AI 补充回答</Tag>;
    return <Tag>{value || '-'}</Tag>;
  };

  const renderText = (value, maxWidth = 320) => <div style={{ maxWidth, whiteSpace: 'pre-wrap', lineHeight: 1.7, wordBreak: 'break-word' }}>{value || '-'}</div>;
  const renderSources = (value) => {
    if (Array.isArray(value)) return value.length ? renderText(value.join('\n'), 260) : '-';
    return renderText(value || '-', 260);
  };

  const columns = [
    { title: '提问时间', dataIndex: 'created_at', width: 176, render: (value) => value || '-' },
    { title: '游客标识', dataIndex: 'visitor_id', width: 160, render: (value) => value || '-' },
    { title: '命中方式', dataIndex: 'hit_mode', width: 120, render: hitModeTag },
    { title: '景区编码', dataIndex: 'scenic_code', width: 120, render: (value) => value || '-' },
    { title: '问题', dataIndex: 'question', width: 260, render: (value) => renderText(value, 260) },
    { title: '回答', dataIndex: 'answer', width: 420, render: (value) => renderText(value, 420) },
    { title: '来源标题', dataIndex: 'sources', width: 260, render: renderSources },
  ];

  return <>
    <PageHead
      title="智能导览记录"
      description="查看游客在小程序中的 AI 问答记录，区分知识库命中和 AI 补充回答。"
      extra={<Space>
        <Select
          value={limit}
          style={{ width: 120 }}
          options={[20, 50, 100, 200].map((value) => ({ value, label: `最近 ${value} 条` }))}
          onChange={(value) => {
            setLimit(value);
            load(value);
          }}
        />
        <Button icon={<ReloadOutlined />} onClick={() => load()}>刷新记录</Button>
      </Space>}
    />
    {!connected && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="本地 Flask 智能导览服务暂不可用" description={`请先确认 ${GUIDE_HISTORY_API} 可以访问，然后再刷新本页。`} />}
    <Card className="content-card">
      <Table
        rowKey={(record) => String(record.id || `${record.created_at}-${record.visitor_id || ''}`)}
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 1650 }}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        locale={{ emptyText: connected ? '暂无问答记录' : '本地服务未连接，暂无数据' }}
      />
    </Card>
  </>;
}

function DashboardScreen() {
  const { message } = AntApp.useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setData(await callCloud('admin/home') || []); }
    catch (error) { message.error(error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const icons = [<TeamOutlined />, <FileTextOutlined />, <CalendarOutlined />, <ReadOutlined />, <AppstoreOutlined />];
  const chartRows = data.length ? data : [{ title: '用户', cnt: 0 }, { title: '内容', cnt: 0 }, { title: '活动', cnt: 0 }, { title: '游记', cnt: 0 }];
  const maxCnt = Math.max(1, ...chartRows.map((item) => Number(item.cnt) || 0));
  const total = chartRows.reduce((sum, item) => sum + (Number(item.cnt) || 0), 0);
  const trendPoints = chartRows.map((item, index) => {
    const x = chartRows.length === 1 ? 50 : (index / (chartRows.length - 1)) * 100;
    const y = 88 - (((Number(item.cnt) || 0) / maxCnt) * 68);
    return `${x},${y}`;
  }).join(' ');

  return <div className="dashboard-screen">
    <div className="dash-glow dash-glow-a" />
    <div className="dash-glow dash-glow-b" />
    <div className="dash-hero">
      <div>
        <div className="dash-kicker">WeCulture Cultural Tourism Command Center</div>
        <h1>文旅运营数据大屏</h1>
        <p>聚合游客、内容、活动、攻略与游记数据，实时观察小程序运营热度。</p>
      </div>
      <Button className="dash-refresh" icon={<ReloadOutlined />} onClick={load}>刷新数据</Button>
    </div>
    <Spin spinning={loading}>
      <Row gutter={[16, 16]}>
        {chartRows.map((item, index) => <Col span={Math.floor(24 / Math.max(chartRows.length, 1))} key={item.title}>
          <div className="dash-metric">
            <div className="dash-metric-icon">{icons[index] || <AppstoreOutlined />}</div>
            <div>
              <div className="dash-metric-label">{item.title}</div>
              <div className="dash-metric-value">{item.cnt || 0}</div>
            </div>
            <div className="dash-metric-ring" />
          </div>
        </Col>)}
      </Row>
    </Spin>
    <Row gutter={[18, 18]} className="dash-grid">
      <Col span={15}>
        <div className="dash-panel">
          <div className="dash-panel-head"><span>核心资源热力</span><em>Resource Heatmap</em></div>
          <div className="dash-bars">
            {chartRows.map((item) => <div className="dash-bar-item" key={item.title}>
              <div className="dash-bar-meta"><span>{item.title}</span><b>{item.cnt || 0}</b></div>
              <div className="dash-bar-track"><div className="dash-bar-fill" style={{ width: `${Math.max(8, ((Number(item.cnt) || 0) / maxCnt) * 100)}%` }} /></div>
            </div>)}
          </div>
        </div>
      </Col>
      <Col span={9}>
        <div className="dash-panel dash-map-panel">
          <div className="dash-panel-head"><span>文旅活跃指数</span><em>Live Pulse</em></div>
          <div className="dash-orbit">
            <div className="dash-orbit-core">{total}</div>
            <div className="dash-orbit-label">累计运营数据</div>
          </div>
        </div>
      </Col>
      <Col span={24}>
        <div className="dash-panel">
          <div className="dash-panel-head"><span>运营走势概览</span><em>Operational Trend</em></div>
          <svg className="dash-line-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={trendPoints} fill="none" stroke="#5eead4" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {trendPoints.split(' ').map((point, index) => {
              const [cx, cy] = point.split(',');
              return <circle key={point + index} cx={cx} cy={cy} r="2.4" fill="#fde68a" vectorEffect="non-scaling-stroke" />;
            })}
          </svg>
        </div>
      </Col>
    </Row>
  </div>;
}

function GuideChatLogBoard() {
  const { message } = AntApp.useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [connected, setConnected] = useState(true);
  const [detail, setDetail] = useState(null);

  const load = async (nextLimit = limit) => {
    setLoading(true);
    try {
      const response = await fetch(`${GUIDE_HISTORY_API}?limit=${nextLimit}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.code !== 0) throw new Error(result.msg || '获取问答记录失败');
      setRows(result.data?.list || []);
      setConnected(true);
    } catch (error) {
      setRows([]);
      setConnected(false);
      message.error(error.message || '智能导览记录加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(limit); }, []);

  const nickname = (record) => record.nickname || record.user_nickname || record.visitor_name || record.visitor_id || '游客';
  const hitModeText = (value) => value === 'knowledge' ? '知识库命中' : value === 'ai_fallback' ? 'AI 补充回答' : (value || '-');
  const hitModeTag = (value) => <Tag color={value === 'knowledge' ? 'green' : value === 'ai_fallback' ? 'blue' : 'default'}>{hitModeText(value)}</Tag>;
  const sourcesText = (value) => Array.isArray(value) ? value.join('、') : (value || '-');

  const columns = [
    { title: '序号', width: 80, render: (_, __, index) => index + 1 },
    { title: '用户昵称', width: 180, render: (_, record) => <Space><UserOutlined />{nickname(record)}</Space>, ellipsis: true },
    { title: '问题', dataIndex: 'question', ellipsis: true },
    { title: '提问时间', dataIndex: 'created_at', width: 190, render: (value) => value || '-' },
    { title: '命中方式', dataIndex: 'hit_mode', width: 150, render: hitModeTag },
  ];

  return <>
    <PageHead
      title="智能导览记录"
      description="查看游客与 AI 的问答记录，点击任意一行可查看完整详情。"
      extra={<Space>
        <Select
          value={limit}
          style={{ width: 128 }}
          options={[20, 50, 100, 200].map((value) => ({ value, label: `最近 ${value} 条` }))}
          onChange={(value) => { setLimit(value); load(value); }}
        />
        <Button icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button>
      </Space>}
    />
    {!connected && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="本地 Flask 智能导览服务暂不可用" description={`请先确认 ${GUIDE_HISTORY_API} 可以访问，然后再刷新本页。`} />}
    <Card className="content-card guide-log-card">
      <Table
        rowKey={(record) => String(record.id || `${record.created_at}-${record.visitor_id || ''}`)}
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        onRow={(record) => ({ onClick: () => setDetail(record) })}
        rowClassName="guide-log-row"
        locale={{ emptyText: connected ? '暂无问答记录' : '本地服务未连接，暂无数据' }}
      />
    </Card>
    <Drawer
      title={<Space><span>问答详情</span>{detail && hitModeTag(detail.hit_mode)}</Space>}
      width={640}
      open={!!detail}
      onClose={() => setDetail(null)}
      className="guide-detail-drawer"
      destroyOnHidden
    >
      {detail && <div className="guide-detail">
        <div className="guide-detail-meta">
          <div><span>用户</span><b><UserOutlined /> {nickname(detail)}</b></div>
          <div><span>提问时间</span><b>{detail.created_at || '-'}</b></div>
        </div>
        <section>
          <h3>用户问题</h3>
          <div className="guide-question-box">{detail.question || '-'}</div>
        </section>
        <section>
          <h3>回答内容 <Tag>{hitModeText(detail.hit_mode)}</Tag></h3>
          <div className="guide-answer-box">{detail.answer || '-'}</div>
        </section>
        <div className="guide-detail-foot">
          <span>来源标题</span>
          <p>{sourcesText(detail.sources)}</p>
          <span>景区编码</span>
          <p>{detail.scenic_code || '-'}</p>
        </div>
      </div>}
    </Drawer>
  </>;
}

function DashboardWarm() {
  const { message } = AntApp.useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setData(await callCloud('admin/home') || []); }
    catch (error) { message.error(error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const icons = [<TeamOutlined />, <FileTextOutlined />, <CalendarOutlined />, <ReadOutlined />, <AppstoreOutlined />];
  const rows = data.length ? data : [{ title: '用户', cnt: 0 }, { title: '内容', cnt: 0 }, { title: '活动', cnt: 0 }, { title: '游记', cnt: 0 }];
  const maxCnt = Math.max(1, ...rows.map((item) => Number(item.cnt) || 0));
  const total = rows.reduce((sum, item) => sum + (Number(item.cnt) || 0), 0);
  const points = rows.map((item, index) => {
    const x = rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100;
    const y = 82 - (((Number(item.cnt) || 0) / maxCnt) * 58);
    return `${x},${y}`;
  }).join(' ');

  return <div className="culture-dashboard">
    <div className="culture-hero">
      <div>
        <Tag color="gold">WeCulture 文旅运营</Tag>
        <h1>文旅内容运营看板</h1>
        <p>以游客、内容、活动、攻略和游记为核心，统一观察小程序运营状态。</p>
      </div>
      <Button type="primary" icon={<ReloadOutlined />} onClick={load}>刷新数据</Button>
    </div>
    <Spin spinning={loading}>
      <Row gutter={[16, 16]}>
        {rows.map((item, index) => <Col span={Math.floor(24 / Math.max(rows.length, 1))} key={item.title}>
          <Card className="culture-metric">
            <Flex align="center" gap={14}>
              <div className="culture-metric-icon">{icons[index] || <AppstoreOutlined />}</div>
              <div>
                <div className="culture-metric-label">{item.title}</div>
                <div className="culture-metric-value">{item.cnt || 0}</div>
              </div>
            </Flex>
          </Card>
        </Col>)}
      </Row>
    </Spin>
    <Row gutter={[18, 18]} style={{ marginTop: 18 }}>
      <Col span={15}>
        <Card className="culture-panel" title="核心数据分布">
          <div className="culture-bars">
            {rows.map((item) => <div className="culture-bar" key={item.title}>
              <div className="culture-bar-top"><span>{item.title}</span><b>{item.cnt || 0}</b></div>
              <div className="culture-bar-track"><div style={{ width: `${Math.max(8, ((Number(item.cnt) || 0) / maxCnt) * 100)}%` }} /></div>
            </div>)}
          </div>
        </Card>
      </Col>
      <Col span={9}>
        <Card className="culture-panel culture-total" title="运营总览">
          <div className="culture-total-num">{total}</div>
          <p>当前后台累计运营数据</p>
          <div className="culture-stamps"><span>公告服务</span><span>活动报名</span><span>游记社区</span></div>
        </Card>
      </Col>
      <Col span={24}>
        <Card className="culture-panel" title="趋势概览">
          <svg className="culture-line" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke="#9a5b32" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {points.split(' ').map((point, index) => {
              const [cx, cy] = point.split(',');
              return <circle key={point + index} cx={cx} cy={cy} r="2.3" fill="#d6a16e" vectorEffect="non-scaling-stroke" />;
            })}
          </svg>
        </Card>
      </Col>
    </Row>
  </div>;
}

function ReviewListPro({ kind }) {
  const isUser = kind === 'user';
  const { message } = AntApp.useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exportUrl, setExportUrl] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  const load = async (nextPage = page) => {
    setLoading(true);
    try {
      const data = await callCloud(isUser ? 'admin/user_list' : 'admin/info_list', { page: nextPage, size: 12, isTotal: true, search: search || undefined });
      setRows(data?.list || []);
      setTotal(data?.total || 0);
      setPage(nextPage);
    } catch (error) { message.error(error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(1); }, [kind]);

  const act = async (route, params) => {
    try { await callCloud(route, params); message.success('操作成功'); load(); }
    catch (error) { message.error(error.message); }
  };

  const showDetail = async (row) => {
    setDetail(row);
    setDetailLoading(true);
    try {
      const data = await callCloud(isUser ? 'admin/user_detail' : 'admin/info_detail', { id: isUser ? row.USER_MINI_OPENID : row._id });
      setDetail({ ...row, ...(data || {}) });
    } catch (error) {
      message.warning(`详情接口暂不可用，已显示列表数据：${error.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const doExport = async () => {
    setExportLoading(true);
    try {
      const data = await callCloud('admin/user_data_export', { condition: search || '', fields: [] });
      setExportUrl(data?.url || data || '');
      message.success('导出完成');
    } catch (error) { message.error(error.message || '导出失败'); }
    finally { setExportLoading(false); }
  };

  const userTitle = (value, fallback = '-') => value || fallback;
  const countsOf = (userData = {}) => ({
    fav: userData.counts?.fav ?? userData.counts?.favCount ?? userData.favList?.length ?? 0,
    join: userData.counts?.join ?? userData.counts?.joinCount ?? userData.joinList?.length ?? 0,
    info: userData.counts?.info ?? userData.counts?.infoCount ?? userData.infoList?.length ?? 0,
    history: userData.counts?.history ?? userData.counts?.historyCount ?? userData.historyList?.length ?? 0,
  });
  const favTitle = (item) => item.title || item.FAV_TITLE || item.FAV_OBJ?.title || item.FAV_NAME || '-';
  const favType = (item) => item.typeName || item.FAV_TYPE_DESC || item.FAV_TYPE || '-';
  const favTime = (item) => item.addTime || item.FAV_ADD_TIME || '-';
  const joinTitle = (item) => item.activityTitle || item.activity?.ACTIVITY_TITLE || item.ACTIVITY_JOIN_OBJ?.title || item.ACTIVITY_JOIN_ACTIVITY_TITLE || '-';
  const joinStatus = (item) => item.statusDesc || item.ACTIVITY_JOIN_STATUS_DESC || (Number(item.ACTIVITY_JOIN_STATUS) === 1 ? '成功' : Number(item.ACTIVITY_JOIN_STATUS) === 0 ? '待审核' : '未通过');
  const joinTime = (item) => item.addTime || item.ACTIVITY_JOIN_ADD_TIME || '-';
  const infoTitle = (item) => item.title || item.INFO_OBJ?.title || item.INFO_TITLE || '-';
  const infoTime = (item) => item.addTime || item.INFO_ADD_TIME || '-';
  const historyTitle = (item) => item.title || item.HISTORY_TITLE || item.HISTORY_NAME || '-';
  const historyType = (item) => item.typeName || item.HISTORY_TYPE_DESC || item.HISTORY_TYPE || '-';
  const historyTime = (item) => item.addTime || item.HISTORY_ADD_TIME || '-';

  const renderDetail = () => {
    if (!detail) return null;
    if (isUser) {
      const userData = detail.userData || {};
      const favList = userData.favList || [];
      const joinList = userData.joinList || [];
      const infoList = userData.infoList || [];
      const historyList = userData.historyList || [];
      const counts = countsOf(userData);
      return <Spin spinning={detailLoading}>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col span={6}><Card size="small"><Statistic title="收藏" value={counts.fav} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="报名" value={counts.join} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="游记" value={counts.info} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="浏览记录" value={counts.history} /></Card></Col>
        </Row>
        <Descriptions bordered column={1} size="small" items={[
          { key: 'name', label: '昵称', children: <Space><Avatar src={detail.USER_PIC} icon={<UserOutlined />} />{userTitle(detail.USER_NAME, '未设置昵称')}</Space> },
          { key: 'mobile', label: '手机', children: detail.USER_MOBILE || '-' },
          { key: 'status', label: '状态', children: <Tag color={Number(detail.USER_STATUS) === 1 ? 'green' : Number(detail.USER_STATUS) === 9 ? 'red' : 'orange'}>{USER_STATUS[detail.USER_STATUS] || detail.USER_STATUS}</Tag> },
          { key: 'login', label: '最近登录', children: detail.USER_LOGIN_TIME || '-' },
          { key: 'add', label: '注册时间', children: detail.USER_ADD_TIME || '-' },
          { key: 'openid', label: 'OpenID', children: <Typography.Text copyable style={{ fontSize: 12 }}>{detail.USER_MINI_OPENID || '-'}</Typography.Text> },
        ]} />
        <Card size="small" style={{ marginTop: 16 }}>
          <Tabs items={[
            { key: 'fav', label: `收藏 (${counts.fav})`, children: favList.length ? <Table rowKey={(r, i) => r._id || `fav-${i}`} size="small" dataSource={favList} columns={[{ title: '名称', render: (_, r) => favTitle(r) }, { title: '类型', width: 110, render: (_, r) => favType(r) }, { title: '时间', width: 170, render: (_, r) => favTime(r) }]} pagination={false} /> : <Empty description="暂无收藏" /> },
            { key: 'join', label: `报名 (${counts.join})`, children: joinList.length ? <Table rowKey={(r, i) => r._id || `join-${i}`} size="small" dataSource={joinList} columns={[{ title: '活动', render: (_, r) => joinTitle(r) }, { title: '状态', width: 110, render: (_, r) => joinStatus(r) }, { title: '报名时间', width: 170, render: (_, r) => joinTime(r) }]} pagination={false} /> : <Empty description="暂无报名" /> },
            { key: 'info', label: `游记 (${counts.info})`, children: infoList.length ? <Table rowKey={(r, i) => r._id || `info-${i}`} size="small" dataSource={infoList} columns={[{ title: '标题', render: (_, r) => infoTitle(r) }, { title: '时间', width: 170, render: (_, r) => infoTime(r) }]} pagination={false} /> : <Empty description="暂无游记" /> },
            { key: 'history', label: `浏览历史 (${counts.history})`, children: historyList.length ? <Table rowKey={(r, i) => r._id || `history-${i}`} size="small" dataSource={historyList} columns={[{ title: '内容', render: (_, r) => historyTitle(r) }, { title: '类型', width: 110, render: (_, r) => historyType(r) }, { title: '时间', width: 170, render: (_, r) => historyTime(r) }]} pagination={false} /> : <Empty description="暂无浏览记录" /> },
          ]} />
        </Card>
      </Spin>;
    }
    return <Spin spinning={detailLoading}>
      <Descriptions bordered column={1} size="small" items={[
        { key: 'title', label: '标题', children: detail.INFO_OBJ?.title || detail.INFO_TITLE || '未命名游记' },
        { key: 'cate', label: '分类', children: detail.INFO_CATE_NAME || '-' },
        { key: 'user', label: '用户', children: detail.user?.USER_NAME || detail.INFO_USER_ID || '匿名用户' },
        { key: 'comment', label: '评论数', children: detail.INFO_COMMENT_CNT || 0 },
        { key: 'status', label: '状态', children: <Tag color={Number(detail.INFO_STATUS) === 1 ? 'green' : 'red'}>{INFO_STATUS[detail.INFO_STATUS] || detail.INFO_STATUS}</Tag> },
        { key: 'time', label: '提交时间', children: detail.INFO_ADD_TIME || '-' },
      ]} />
      <Card title="游记内容" size="small" style={{ marginTop: 14 }}>
        <pre className="json-preview">{safeJson(detail.INFO_FORMS || detail.INFO_OBJ || {})}</pre>
      </Card>
    </Spin>;
  };

  const columns = isUser ? [
    { title: '用户', width: 210, render: (_, r) => <Space><Avatar src={r.USER_PIC} icon={<UserOutlined />} size="small" /><Typography.Text ellipsis style={{ maxWidth: 140 }}>{r.USER_NAME || '未设置昵称'}</Typography.Text></Space> },
    { title: '手机', dataIndex: 'USER_MOBILE', width: 120, ellipsis: true, render: (v) => v || '-' },
    { title: '状态', dataIndex: 'USER_STATUS', width: 90, render: (v) => <Tag color={Number(v) === 1 ? 'green' : Number(v) === 9 ? 'red' : 'orange'}>{USER_STATUS[v] || v}</Tag> },
    { title: '登录', dataIndex: 'USER_LOGIN_CNT', width: 70 },
    { title: '最近登录', dataIndex: 'USER_LOGIN_TIME', width: 170, ellipsis: true },
    { title: '注册时间', dataIndex: 'USER_ADD_TIME', width: 170, ellipsis: true },
    { title: '操作', width: 220, render: (_, r) => <Space size={2}>
      <Button size="small" onClick={() => showDetail(r)}>详情</Button>
      {Number(r.USER_STATUS) === 0 && <Button size="small" onClick={() => act('admin/user_status', { id: r.USER_MINI_OPENID, status: 1, reason: '' })}>通过</Button>}
      {Number(r.USER_STATUS) === 9 ? <Button size="small" onClick={() => act('admin/user_status', { id: r.USER_MINI_OPENID, status: 1, reason: '' })}>恢复</Button> : <Button size="small" onClick={() => act('admin/user_status', { id: r.USER_MINI_OPENID, status: 9, reason: '后台禁用' })}>禁用</Button>}
      <Popconfirm title="确认删除该用户及关联数据？" onConfirm={() => act('admin/user_del', { id: r.USER_MINI_OPENID })}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
    </Space> },
  ] : [
    { title: '游记标题', width: 260, ellipsis: true, render: (_, r) => <div><Typography.Text ellipsis style={{ maxWidth: 230 }}>{r.INFO_OBJ?.title || r.INFO_TITLE || '未命名游记'}</Typography.Text><div style={{ color: '#999', fontSize: 11 }}>{r.user?.USER_NAME || '匿名用户'}</div></div> },
    { title: '分类', dataIndex: 'INFO_CATE_NAME', width: 90 },
    { title: '状态', dataIndex: 'INFO_STATUS', width: 80, render: (v) => <Tag color={Number(v) === 1 ? 'green' : 'red'}>{INFO_STATUS[v] || v}</Tag> },
    { title: '评论', dataIndex: 'INFO_COMMENT_CNT', width: 70 },
    { title: '排序', dataIndex: 'INFO_ORDER', width: 80, render: (v) => Number(v) === 0 ? <Tag color="blue">置顶</Tag> : v },
    { title: '推荐', dataIndex: 'INFO_VOUCH', width: 80, render: (v) => Number(v) === 1 ? <Tag color="gold">首页</Tag> : '-' },
    { title: '提交时间', dataIndex: 'INFO_ADD_TIME', width: 170, ellipsis: true },
    { title: '操作', width: 300, render: (_, r) => <Space size={2}>
      <Button size="small" onClick={() => showDetail(r)}>详情</Button>
      <Button size="small" onClick={() => act('admin/info_status', { id: r._id, status: Number(r.INFO_STATUS) === 1 ? 0 : 1 })}>{Number(r.INFO_STATUS) === 1 ? '停用' : '启用'}</Button>
      <Button size="small" onClick={() => act('admin/info_sort', { id: r._id, sort: Number(r.INFO_ORDER) === 0 ? 9999 : 0 })}>{Number(r.INFO_ORDER) === 0 ? '去置顶' : '置顶'}</Button>
      <Button size="small" icon={Number(r.INFO_VOUCH) === 1 ? <StarFilled /> : <StarOutlined />} onClick={() => act('admin/info_vouch', { id: r._id, vouch: Number(r.INFO_VOUCH) === 1 ? 0 : 1 })}>{Number(r.INFO_VOUCH) === 1 ? '去推荐' : '推荐'}</Button>
      <Popconfirm title="确认删除？删除不可恢复" onConfirm={() => act('admin/info_del', { id: r._id })}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
    </Space> },
  ];

  return <>
    <PageHead title={isUser ? '用户管理' : '游记管理'} description={isUser ? '查看注册用户、审核状态与用户行为数据' : '管理用户发布的游记、展示状态、置顶与首页推荐'} extra={isUser ? <Space><Button icon={<ExportOutlined />} loading={exportLoading} onClick={doExport}>导出</Button>{exportUrl && <a href={exportUrl} target="_blank" rel="noreferrer"><Button icon={<DownloadOutlined />}>下载导出文件</Button></a>}</Space> : undefined} />
    <Card className="content-card"><div className="toolbar"><div className="toolbar-left"><Input value={search} onChange={e => setSearch(e.target.value)} onPressEnter={() => load(1)} allowClear prefix={<SearchOutlined />} placeholder={isUser ? '昵称、手机号' : '搜索'} style={{ width: 260 }} /><Button onClick={() => load(1)}>查询</Button></div><Button icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button></div><Table rowKey={isUser ? 'USER_MINI_OPENID' : '_id'} loading={loading} dataSource={rows} columns={columns} scroll={{ x: isUser ? 1050 : 1180 }} pagination={{ current: page, pageSize: 12, total, onChange: load, showTotal: n => `共 ${n} 条` }} /></Card>
    <Drawer title={isUser ? '用户详情' : '游记详情'} width={820} open={!!detail} onClose={() => setDetail(null)} destroyOnHidden>{renderDetail()}</Drawer>
  </>;
}

function SettingsPage() {
  const {message}=AntApp.useApp();const [about,setAbout]=useState([]);const [qr,setQr]=useState('');const [pwdForm]=Form.useForm();
  const load=async()=>{try{const d=await callCloud('home/setup_get',{key:'SETUP_CONTENT_ABOUT'});setAbout(Array.isArray(d)?d:[])}catch(e){message.error(e.message)}};useEffect(()=>{load()},[]);
  return <><PageHead title="系统设置" description="维护关于我们、小程序二维码与当前管理员密码"/><Row gutter={[18,18]}><Col span={14}><Card title="关于我们（文本+图片混合编辑）" className="content-card"><ContentEditor value={about} onChange={setAbout}/><Button type="primary" style={{marginTop:14}} onClick={async()=>{try{await callCloud('admin/setup_set_content',{id:'SETUP_CONTENT_ABOUT',content:about});message.success('关于我们已保存')}catch(e){message.error(e.message)}}}>保存内容</Button></Card></Col><Col span={10}><Card title="小程序二维码" className="content-card"><Input placeholder="小程序页面路径，如 projects/culture/pages/default/index/default_index" id="qr-path"/><Button icon={<QrcodeOutlined/>} style={{marginTop:14}} onClick={async()=>{const path=document.getElementById('qr-path').value;if(!path)return message.warning('请输入小程序页面路径');try{const d=await callCloud('admin/setup_qr',{path,sc:'web-admin'});setQr(d);message.success('二维码生成成功')}catch(e){message.error(e.message)}}}>生成二维码</Button>{qr&&<div className="json-preview" style={{marginTop:14}}>{String(qr)}</div>}</Card><Card title="账号安全" className="content-card" style={{marginTop:18}}><Form form={pwdForm} layout="vertical" onFinish={async(v)=>{if(v.password!==v.password2)return message.error('两次新密码不一致');try{await callCloud('admin/mgr_pwd',v);message.success('密码修改成功');pwdForm.resetFields()}catch(e){message.error(e.message)}}}><Form.Item name="oldPassword" label="旧密码" rules={[{required:true,min:6}]}><Input.Password/></Form.Item><Form.Item name="password" label="新密码" rules={[{required:true,min:6}]}><Input.Password/></Form.Item><Form.Item name="password2" label="再次输入新密码" rules={[{required:true,min:6}]}><Input.Password/></Form.Item><Button htmlType="submit" type="primary">修改密码</Button></Form></Card></Col></Row></>;
}

const menuItems = [
  { key:'dashboard', icon:<DashboardOutlined/>, label:'数据看板' },
  { key:'guideLogs', icon:<HistoryOutlined/>, label:'智能导览记录' },
  { key:'operations', type:'group', label:'业务管理', children:[
    { key:'users', icon:<TeamOutlined/>, label:'用户管理' }, { key:'news', icon:<FileTextOutlined/>, label:'公告 / 服务' }, { key:'product', icon:<AppstoreOutlined/>, label:'旅行攻略' }, { key:'activity', icon:<CalendarOutlined/>, label:'活动与名单管理' }, { key:'info', icon:<ReadOutlined/>, label:'游记管理' },
  ]},
  { key:'system', type:'group', label:'系统管理', children:[
    { key:'settings', icon:<SettingOutlined/>, label:'关于我们 / 二维码 / 密码' }, { key:'admins', icon:<SafetyCertificateOutlined/>, label:'系统管理员管理' }, { key:'logs', icon:<HistoryOutlined/>, label:'管理员操作日志' },
  ]},
];

const titles = {dashboard:'数据看板',users:'用户管理',news:'公告 / 服务',product:'旅行攻略',activity:'活动与名单管理',info:'游记管理',guideLogs:'智能导览记录',admins:'系统管理员管理',logs:'管理员操作日志',settings:'关于我们 / 二维码 / 密码'};
const pageKeys = Object.keys(titles);
const getHashKey = () => {
  const key = window.location.hash.replace(/^#\/?/, '');
  return pageKeys.includes(key) ? key : 'dashboard';
};
const goPage = (key) => {
  if (!pageKeys.includes(key)) return;
  if (getHashKey() === key) return;
  window.location.hash = key;
};

function AdminShell() {
  const [selected,setSelected]=useState(getHashKey);const [collapsed,setCollapsed]=useState(false);const session=getAdminSession();
  useEffect(()=>{const onHash=()=>setSelected(getHashKey());window.addEventListener('hashchange',onHash);onHash();return()=>window.removeEventListener('hashchange',onHash)},[]);
  const page=useMemo(()=>({dashboard:<DashboardWarm/>,users:<ReviewListPro kind="user"/>,news:<ManagedResource type="news"/>,product:<ManagedResource type="product"/>,activity:<ManagedResource type="activity"/>,info:<ReviewListPro kind="info"/>,guideLogs:<GuideChatLogBoard/>,admins:<AdminManagement/>,logs:<Logs/>,settings:<SettingsPage/>}[selected]),[selected]);
  return <Layout className="app-layout"><Sider className="app-sider" width={236} collapsed={collapsed} collapsible trigger={null}><div className="side-brand"><div className="side-logo">文</div>{!collapsed&&<div><strong>WeCulture</strong><small>文旅管理后台</small></div>}</div><Menu mode="inline" theme="dark" selectedKeys={[selected]} items={menuItems} onClick={({key})=>goPage(key)} style={{paddingTop:12}}/></Sider><Layout><Header className="top-header"><div className="header-left"><Button className="collapse-btn" type="text" icon={collapsed?<MenuUnfoldOutlined/>:<MenuFoldOutlined/>} onClick={()=>setCollapsed(!collapsed)}/><div className="header-copy"><div className="header-title">{titles[selected]}</div><div className="header-sub">CloudBase 环境：{ENV_ID}</div></div></div><Dropdown menu={{items:[{key:'settings',label:'账号与设置',icon:<SettingOutlined/>},{type:'divider'},{key:'logout',label:'退出登录',icon:<LogoutOutlined/>,danger:true}],onClick:({key})=>key==='logout'?setAdminSession(null):goPage('settings')}}><div className="user-entry"><Avatar size={38} style={{background:'#9a5b32'}} icon={<UserOutlined/>}/><div className="user-copy"><b>{session?.name}</b><span>{Number(session?.type)===1?'超级管理员':'普通管理员'}</span></div></div></Dropdown></Header><Content className="page-content"><PageErrorBoundary pageKey={selected}>{page}</PageErrorBoundary></Content></Layout></Layout>;
}

export default function App() {
  const [session,setSession]=useState(getAdminSession());
  useEffect(()=>{const handler=()=>setSession(getAdminSession());window.addEventListener('weculture-auth-change',handler);return()=>window.removeEventListener('weculture-auth-change',handler)},[]);
  return <AntApp>{session?<AdminShell/>:<LoginPage/>}</AntApp>;
}
