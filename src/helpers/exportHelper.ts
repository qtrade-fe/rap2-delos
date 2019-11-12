import { Repository, Property } from "../models"
import * as moment from "moment"

interface ExportInterface {
  name: string
  url: string
  method: string
  description: string
  updatedAt: string
  response: ExportProperty[]
  request: ExportProperty[]
}

interface ExportProperty {
  type: string
  name: string
  description: string
  required: boolean
  parentId: number
}

type PropertyMap = Map<number, ExportProperty>

const getParentPref = (propMap: PropertyMap, prop: ExportProperty) => {
  let pref = ''
  if (prop.parentId !== -1) {
    pref += '&nbsp;&nbsp;&nbsp;&nbsp;'
    if (propMap.has(prop.parentId)) {
      pref += getParentPref(propMap, propMap.get(prop.parentId))
    }
  }
  return pref
}

const setPropMap = (propMap: PropertyMap, prop: Property) => {
  const p: ExportProperty = {
    type: prop.type,
    name: prop.name,
    description: prop.description,
    required: prop.required,
    parentId: prop.parentId
  }
  const pref = getParentPref(propMap, p)
  p.name = pref + p.name
  propMap.set(prop.id, p)
}

const translate = (repository: Partial<Repository>) => {
  const modules = repository.modules.map(mod => {
    const interfaces = mod.interfaces.map(
      (item): ExportInterface => {
        const { properties } = item
        const request: PropertyMap = new Map()
        const response: PropertyMap = new Map()
        properties.forEach(prop => {
          if (prop.scope === Property.SCOPES.REQUEST) {
            setPropMap(request, prop)
          } else {
            setPropMap(response, prop)
          }
        })
        return {
          request: [...request.values()],
          response: [...response.values()],
          name: item.name,
          url: item.url,
          method: item.method,
          description: item.description,
          updatedAt: item.updatedAt
        }
      }
    )

    return {
      interfaces,
      name: mod.name,
      description: mod.description
    }
  })
  return {
    modules,
    name: repository.name,
    description: repository.description
  }
}

const exportProps = (properties: ExportProperty[]) => {
  return `
  <table>
  <thead>
  <tr>
  <th width="180">参数名</th>
  <th width="45%">简介</th>
  <th width="80">类型</th>
  <th width="50">必填</th>
  </tr>
  </thead>
  <tbody>
  ${properties
    .map(
      req => `
    <tr>
      <td>${req.name}</td>
      <td>${req.description ? req.description : ""}</td>
      <td>${req.type}</td>
      <td>${req.required ? "是" : ""}</td>
    </tr>
  `
    )
    .join("\n")}
  </tbody>

</table>
  `
}

const exportInterfaces = (interfaces: ExportInterface[]) => {
  return interfaces.map(
    item => `
  <div>
        <div class="interface-info">
          <div><span>接口名</span>${item.name}</div>
          <div><span>接口简介</span>${item.description}</div>
          <div><span>接口URL</span>${item.method} ${item.url}</div>
          <div><span>更新时间</span>${moment(item.updatedAt).format(
            "YYYY-MM-DD HH:mm:ss"
          )}</div>
        </div>
        <div>
        <div>
        <div class="props-table-title">请求参数</div>
        ${exportProps(item.request)}
        </div>
        <div>
        <div class="props-table-title">响应参数</div>
        ${exportProps(item.response)}
        </div>
        </div>
    </div>
  `
  )
}
export default function exportHtml(repository: Repository, origin = '') {
  const exportData = translate(repository)
  const modules: String[] = exportData.modules.map(item => {
    return `
      <div>
        <div>
          <h4>${item.name}</h4>
          <p>${item.description}</p>
        </div>
        <div>
          ${exportInterfaces(item.interfaces).join("\n")}
        </div>
      </div>
    `
  })
  const template = `
  <html>
  <head>
      <style>
        body{
          max-width: 650px;
          margin: 0 auto 24px;
        }
        .interface-info{
          border: 1px solid #e1e1e1;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          margin-top: 24px;
        }
        .interface-info span{
          display: inline-block;
          font-weight: bold;
          width: 80px;
        }
        .props-table-title{
          margin: 16px auto 6px;
        }
        table{
          font-size: 12px;
          width: 100%;
        }
        th{
          text-align: left;
          background: #ccc;
          padding: 6px;
          font-size: 14px;
        }
        tr:nth-of-type(even) td{
          background: #eee;
        }
        tr:last-child td{
          border-bottom: 1px solid #eee;
        }
        td{
          padding: 6px;
        }
        </style>
    </head>
  <body>
  <div>
  <div>
    <p>本文档由 Rap2 生成</p>
    <p>本项目仓库：<a href="${origin}/repository/editor?id=${repository.id}">${origin}/repository/editor?id=${repository.id}</a>
  </div>
  <h1>${repository.name}</h1>
  <p>${repository.description}</p>
  </div>
  <div>${modules.join("\n")}</div>
  </body>
  </html>
  `

  return template
}
