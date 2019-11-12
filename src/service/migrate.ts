import {
  Repository,
  Module,
  Interface,
  Property,
  User,
  QueryInclude
} from "../models"
import { SCOPES } from "../models/bo/property"
import * as md5 from "md5"
import * as querystring from "querystring"
import * as rp from "request-promise"
import _ = require("lodash")

const isMd5 = require("is-md5")

export default class MigrateService {
  public static async importRepoFromRAP1ProjectData(
    orgId: number,
    curUserId: number,
    projectData: any
  ): Promise<boolean> {
    if (!projectData || !projectData.id || !projectData.name) return false
    let pCounter = 1
    let mCounter = 1
    let iCounter = 1
    const repo = await Repository.create({
      name: projectData.name,
      description: projectData.introduction,
      visibility: true,
      ownerId: curUserId,
      creatorId: curUserId,
      organizationId: orgId
    })
    for (const module of projectData.moduleList) {
      const mod = await Module.create({
        name: module.name,
        description: module.introduction,
        priority: mCounter++,
        creatorId: curUserId,
        repositoryId: repo.id
      })
      for (const page of module.pageList) {
        for (const action of page.actionList) {
          const itf = await Interface.create({
            moduleId: mod.id,
            name: `${page.name}-${action.name}`,
            description: action.description,
            url: action.requestUrl || "",
            priority: iCounter++,
            creatorId: curUserId,
            repositoryId: repo.id,
            method: getMethodFromRAP1RequestType(+action.requestType)
          })
          for (const p of action.requestParameterList) {
            await processParam(p, SCOPES.REQUEST)
          }
          for (const p of action.responseParameterList) {
            await processParam(p, SCOPES.RESPONSE)
          }
          async function processParam(
            p: OldParameter,
            scope: SCOPES,
            parentId?: number
          ) {
            const RE_REMARK_MOCK = /@mock=(.+)$/
            const ramarkMatchMock = RE_REMARK_MOCK.exec(p.remark)
            const remarkWithoutMock = p.remark.replace(RE_REMARK_MOCK, "")
            const name = p.identifier.split("|")[0]
            let rule = p.identifier.split("|")[1] || ""
            let type = (p.dataType || "string").split("<")[0] // array<number|string|object|boolean> => Array
            type = type[0].toUpperCase() + type.slice(1) // foo => Foo
            let value = (ramarkMatchMock && ramarkMatchMock[1]) || ""
            if (/^function/.test(value)) type = "Function" // @mock=function(){} => Function
            if (/^\$order/.test(value)) {
              // $order => Array|+1
              type = "Array"
              rule = "+1"
              let orderArgs = /\$order\((.+)\)/.exec(value)
              if (orderArgs) value = `[${orderArgs[1]}]`
            }
            let description = []
            if (p.name) description.push(p.name)
            if (p.remark && remarkWithoutMock)
              description.push(remarkWithoutMock)

            const pCreated = await Property.create({
              scope,
              name,
              rule,
              value,
              type,
              description: `${p.remark}${p.name ? ", " + p.name : ""}`,
              priority: pCounter++,
              interfaceId: itf.id,
              creatorId: curUserId,
              moduleId: mod.id,
              repositoryId: repo.id,
              parentId: parentId || -1
            })
            for (const subParam of p.parameterList) {
              processParam(subParam, scope, pCreated.id)
            }
          }
        }
      }
    }
    return true
  }

  public static async importRepoFromSwaggerDocData(
    orgId: number,
    curUserId: number,
    apiDocs: any,
    docUrl: string
  ): Promise<boolean> {
    const docData = translateSwaggerDoc(apiDocs)
    if (!docData || !docData.title || !docData.modules) return false
    let pCounter = 1
    let mCounter = 1
    let iCounter = 1
    const repo = await Repository.create({
      name: docData.title,
      description: docData.description,
      visibility: true,
      ownerId: curUserId,
      creatorId: curUserId,
      organizationId: orgId,
      sourceUrl: docUrl
    })
    for (const module of docData.modules) {
      const mod = await Module.create({
        name: module.name,
        description: module.description,
        priority: mCounter++,
        creatorId: curUserId,
        repositoryId: repo.id
      })
      for (const action of module.interface) {
        const itf = await Interface.create({
          moduleId: mod.id,
          name: action.name,
          description: "",
          url: action.url || "",
          priority: iCounter++,
          creatorId: curUserId,
          repositoryId: repo.id,
          method: action.method.toUpperCase(),
          bodyType: getBodyType(action)
        })
        for (const p of action.requests) {
          await processParam(p, SCOPES.REQUEST)
        }
        for (const p of action.responses) {
          await processParam(p, SCOPES.RESPONSE)
        }

        async function processParam(
          p: SwaggerParameter,
          scope: SCOPES,
          parent: {
            id?: number;
            in?: string;
          } = {}
        ) {
          if (scope === SCOPES.REQUEST) {
            p.in = p.in || parent.in
          }
          const baseProp = getBaseProps(p, scope)

          const pCreated = await Property.create({
            ...baseProp,
            priority: pCounter++,
            interfaceId: itf.id,
            creatorId: curUserId,
            moduleId: mod.id,
            repositoryId: repo.id,
            parentId: parent.id || -1
          })
          if (p.type === "array" && p.properties) {
            for (const subParam of Object.keys(p.properties)) {
              processParam(p.properties[subParam], scope, {
                id: pCreated.id,
                in: p.in
              })
            }
          }
          if (p.type === "object") {
            for (const subParam of Object.keys(p.properties)) {
              processParam(p.properties[subParam], scope, {
                id: pCreated.id,
                in: p.in
              })
            }
          }
        }
      }
    }
    return true
  }
  public static checkAndFix(): void {
    // console.log('checkAndFix')
    // this.checkPasswordMd5().then()
  }

  static async checkPasswordMd5() {
    console.log("  checkPasswordMd5")
    const users = await User.findAll()
    if (users.length === 0 || isMd5(users[0].password)) {
      console.log("  users empty or md5 check passed")
      return
    }
    for (const user of users) {
      if (!isMd5(user.password)) {
        user.password = md5(md5(user.password))
        await user.save()
        console.log(`handle user ${user.id}`)
      }
    }
  }

  /** RAP1 property */
  public static async importRepoFromRAP1DocUrl(
    orgId: number,
    curUserId: number,
    docUrl: string
  ): Promise<boolean> {
    const { projectId } = querystring.parse(
      docUrl.substring(docUrl.indexOf("?") + 1)
    )
    let domain = docUrl
    if (domain.indexOf("http") === -1) {
      domain = "http://" + domain
    }
    domain = domain.substring(0, domain.indexOf("/", domain.indexOf(".")))
    let result = await rp(
      `${domain}/api/queryRAPModel.do?projectId=${projectId}`,
      {
        json: false
      }
    )
    result = JSON.parse(result)

    // result =  unescape(result.modelJSON)
    result = result.modelJSON
    const safeEval = require("notevil")
    result = safeEval("(" + result + ")")
    return await this.importRepoFromRAP1ProjectData(orgId, curUserId, result)
  }
  /** Swagger property */
  public static async importRepoFromSwaggerDocUrl(
    orgId: number,
    curUserId: number,
    docUrl: string
  ): Promise<boolean> {
    const swaggerDocs = await getSwaggerDocByBase(docUrl)
    let result = false
    try {
      for (const doc of swaggerDocs) {
        await this.importRepoFromSwaggerDocData(
          orgId,
          curUserId,
          doc.data,
          doc.url
        )
      }
      result = true
    } catch (error) {
      result = false
    }

    return result
  }
  public static async syncProperties(
    itf: Interface,
    { deleteProps, modify }: SyncData,
    curUserId: number
  ) {
    let dCount = 0
    let mCount = 0
    let cCount = 0
    let pCount = 0
    for (const p of deleteProps) {
      dCount += 1
      await p.destroy({ force: true })
    }
    async function syncProps(m: ModifyArgs, parentId?: number) {
      let currId = m.id
      if (m.type == "create") {
        cCount += 1
        const pCreated = await Property.create({
          ...m.prop,
          priority: pCount++,
          interfaceId: itf.id,
          creatorId: curUserId,
          moduleId: itf.moduleId,
          repositoryId: itf.repositoryId,
          parentId: parentId || -1
        })
        currId = pCreated.id
      } else if (m.type == "update") {
        mCount += 1
        pCount += 1
        await Property.update(
          { ...m.prop },
          {
            where: {
              id: m.id
            }
          }
        )
      }
      for (const c of m.children) {
        await syncProps(c, currId)
      }
    }
    for (const m of modify) {
      await syncProps(m)
    }
    return {
      modify: mCount,
      delete: dCount,
      create: cCount
    }
  }
  public static async syncInterfaceByDocUrl(
    itfId: number,
    curUserId: number
  ): Promise<any> {
    const itf = await Interface.findByPk(itfId, {
      include: [QueryInclude.Properties]
    })
    const { sourceUrl } = await Repository.findByPk(itf.repositoryId, {
      attributes: ["sourceUrl"]
    })
    const apiDocs = await getSwaggerApiDoc(sourceUrl)
    const modifyInterface = {
      ...itf
    }
    const swaggerItf = getInterfaceInSwaggerDoc(
      apiDocs,
      itf.url,
      itf.method.toLowerCase(),
      itf.status.toString()
    )
    if (modifyInterface.name !== swaggerItf.name) {
      modifyInterface.name = swaggerItf.name
    }
    const syncData = modifyInterfaceAndSwaggerDoc(itf, swaggerItf)

    return await this.syncProperties(itf, syncData, curUserId)
  }
}

function getMethodFromRAP1RequestType(type: number) {
  switch (type) {
    case 1:
      return "GET"
    case 2:
      return "POST"
    case 3:
      return "PUT"
    case 4:
      return "DELETE"
    default:
      return "GET"
  }
}
function getPosByString(type: string) {
  switch (type) {
    case "header":
      return 1
    case "query":
      return 2
    case "body":
    case "formData":
      return 3
    default:
      return 2
  }
}
function getBodyType(action: any) {
  const { consumes = [] } = action
  const contentType = consumes.find((type: string) => !!type)
  switch (contentType) {
    case "application/x-www-form-urlencoded":
      return Interface.BODY_TYPE.FORM_URLENCODED
    case "application/form-data":
      return Interface.BODY_TYPE.FORM_DATA
    case "application/json":
    case "application/javascript":
    case "application/xml":
    case "text/plain":
    case "text/html":
    default:
      return Interface.BODY_TYPE.RAW
  }
}
function getBaseProps(swaggerProp: SwaggerParameter, scope: string) {
  const name = swaggerProp.name
  let type = swaggerProp.type || "string" // array<number|string|object|boolean> => Array
  type = type[0].toUpperCase() + type.slice(1) // foo => Foo
  if (type === "Integer" || type === "Float") {
    type = "Number"
  }
  if (type === "Ref") {
    type = "String"
  }
  let pos = 2
  if (scope === SCOPES.REQUEST) {
    pos = getPosByString(swaggerProp.in)
  }
  let rule = undefined
  let value = undefined
  if (swaggerProp.example) {
    let exampleStr = swaggerProp.example.toString()
    if (exampleStr.indexOf("|") === -1) {
      exampleStr = "|" + exampleStr
    }
    const mockRule = exampleStr.split("|")
    if (mockRule.length < 2) {
      mockRule.push("")
    }
    rule = mockRule[0]
    value = mockRule[1]
  }
  const description = swaggerProp.description || undefined
  return {
    scope,
    name,
    type,
    description,
    pos,
    rule,
    value,
    required: swaggerProp.required
  }
}
function modifyInterfaceAndSwaggerDoc(
  { properties }: Interface,
  swaggerItf: any
) {
  const { requests: swaggerReq, responses: swaggerResp } = swaggerItf
  const parentProp: any[] = getChildren(-1, properties)
  const requests = parentProp.filter(item => item.scope === SCOPES.REQUEST)
  const responses = parentProp.filter(item => item.scope === SCOPES.RESPONSE)
  const modify = []
  const updateIds = new Set()
  for (const p of swaggerReq) {
    modify.push(modifyPropertiesAndSwagger(p, requests, SCOPES.REQUEST))
  }
  for (const p of swaggerResp) {
    modify.push(modifyPropertiesAndSwagger(p, responses, SCOPES.RESPONSE))
  }
  function getID(modifyArgsList: ModifyArgs[]) {
    modifyArgsList.forEach(modifyArgs => {
      if (modifyArgs.id) {
        updateIds.add(modifyArgs.id)
      }
      getID(modifyArgs.children)
    })
  }
  getID(modify)
  const deleteProps = properties.filter(item => !updateIds.has(item.id))
  return {
    deleteProps,
    modify
  }
}
function modifyPropertiesAndSwagger(
  swaggerProp: SwaggerParameter,
  properties: (Property & { children?: Property[] })[],
  scope: string
) {
  const prop = getBaseProps(swaggerProp, scope)
  let type: ModifyType = "equal"
  let children: ModifyArgs[] = []
  const p = properties.find(p => p.name === prop.name)
  const modify: ModifyArgs = {
    id: p ? p.id : undefined,
    type,
    prop,
    children
  }

  if (p && !_.isEqualWith(p, prop, equalProps)) {
    modify.type = "update"
  } else if (!p) {
    modify.type = "create"
  }
  if (
    (prop.type === "Array" || prop.type === "Object") &&
    swaggerProp.properties
  ) {
    for (const subParam of Object.keys(swaggerProp.properties)) {
      children.push(
        modifyPropertiesAndSwagger(
          swaggerProp.properties[subParam],
          p ? p.children : [],
          scope
        )
      )
    }
  }

  return modify
}
function equalProps(pValue: Property, sValue: any) {
  if (pValue.description !== sValue.description) {
    return false
  }
  if (pValue.type !== sValue.type) {
    return false
  }
  if (!!pValue.required !== !!sValue.required) {
    return false
  }
  if (pValue.pos !== sValue.pos) {
    return false
  }
  if (pValue.rule !== sValue.rule) {
    return false
  }
  if (pValue.value !== sValue.value) {
    return false
  }
  return true
}
function getChildren(parentId: number, properties: Property[]) {
  const children: any[] = []
  properties.forEach(prop => {
    if (prop.parentId === parentId) {
      children.push({
        description: prop.description,
        id: prop.id,
        name: prop.name,
        parentId: prop.parentId,
        pos: prop.pos,
        required: prop.required,
        rule: prop.rule,
        scope: prop.scope,
        type: prop.type,
        value: prop.value,
        children: getChildren(prop.id, properties)
      })
    }
  })
  return children
}
function getInterfaceInSwaggerDoc(
  apiDocs: any,
  url: string,
  method: string,
  status: string
) {
  const swaggerApi = apiDocs.paths[url][method]
  let responses: any[] = []
  if (swaggerApi.responses.hasOwnProperty(status)) {
    const { schema } = swaggerApi.responses[status]
    if (schema) {
      const properties = getPropertiesBySchema(schema, apiDocs)
      responses = getPropertiesList(properties)
    }
  }
  return {
    url,
    method,
    responses,
    name: `${method} - ${swaggerApi.summary}`,
    requests: swaggerApi.parameters || []
  }
}
async function getSwaggerApiDoc(docUrl: string) {
  return await rp(docUrl, {
    json: true
  })
}
async function getSwaggerDocByBase(docUrl: string) {
  let domain = docUrl
  if (domain.indexOf("http") === -1) {
    domain = "http://" + domain
  }
  domain = domain.substring(0, domain.indexOf("/swagger-ui.html"))
  const swResources = await rp(`${domain}/swagger-resources`, {
    json: true
  })
  const apiDocs = []
  for (const res of swResources) {
    const url = `${domain}${res.location}`
    const apiDoc = await getSwaggerApiDoc(url)
    apiDocs.push({ url, data: apiDoc })
  }

  return apiDocs
}
function getPropertiesBySchema(schema: any, apiDocs: any, parentRef?: string) {
  const { $ref, ...otherProps } = schema
  let data = otherProps
  if ($ref) {
    const ref = $ref.replace("#/definitions/", "")
    const refProps = apiDocs.definitions[ref]
    data = {
      ...otherProps,
      ...refProps
    }
  }
  for (const key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] === "object") {
      if ($ref !== parentRef) {
        data[key] = getPropertiesBySchema(
          data[key],
          apiDocs,
          $ref || parentRef
        )
      }
    }
  }
  return data
}
function getPropertiesList(p: any) {
  const list: SwaggerParameter[] = []
  let props: any = {}
  if (p.type === "object") {
    props = p.properties || {}
  }
  if (p.type === "array" && p.items.type === "object") {
    props = p.items.properties || {}
  }
  Object.keys(props).forEach(key => {
    const oldProp = props[key]
    list.push({
      name: key,
      type: oldProp.type,
      description: oldProp.description,
      example: oldProp.example || "",
      properties: getPropertiesList(oldProp)
    })
  })
  return list
}
function translateSwaggerDoc(apiDocs: any): any {
  if (!apiDocs || !apiDocs.swagger || !apiDocs.info.title) {
    return undefined
  }

  const docData: {
    title: string;
    description: string;
    modules?: any;
  } = {
    title: apiDocs.info.title,
    description: apiDocs.info.description
  }
  const moduleMap = new Map()
  apiDocs.tags.forEach((tag: any) => {
    moduleMap.set(tag.name, {
      name: tag.name,
      description: tag.description,
      interface: []
    })
  })

  for (const url in apiDocs.paths) {
    if (apiDocs.paths.hasOwnProperty(url)) {
      const path = apiDocs.paths[url]
      for (const method in path) {
        if (path.hasOwnProperty(method)) {
          const pathMethod = path[method]

          const itf = {
            url,
            method,
            consumes: pathMethod.consumes,
            name: `${method} - ${pathMethod.summary}`,
            requests: pathMethod.parameters || []
          }
          const requests = []
          for (const param of itf.requests) {
            const { schema } = param
            if (schema) {
              const properties = getPropertiesBySchema(schema, apiDocs)
              const propsList = getPropertiesList(properties)
              propsList.forEach(item => {
                requests.push({
                  in: param.in,
                  required: param.required,
                  ...item
                })
              })
            } else {
              requests.push(param)
            }
          }
          itf.requests = requests
          for (const status in pathMethod.responses) {
            if (pathMethod.responses.hasOwnProperty(status)) {
              const statusCode = parseInt(status)
              if (statusCode >= 200 && statusCode < 400) {
                const { schema } = pathMethod.responses[status]
                if (schema) {
                  const properties = getPropertiesBySchema(schema, apiDocs)
                  pathMethod.tags.forEach((tag: string) => {
                    const mod = moduleMap.get(tag)
                    mod.interface.push({
                      ...itf,
                      status: statusCode,
                      responses: getPropertiesList(properties)
                    })
                  })
                }
              }
            }
          }
        }
      }
    }
  }
  docData.modules = [...moduleMap.values()]

  return docData
}

// function getTypeFromRAP1DataType(dataType: string) {
//   switch (dataType) {
//     case 'number':
//       return TYPES.NUMBER
//     case 'string':
//       return TYPES.STRING
//     case 'boolean':
//       return TYPES.BOOLEAN
//     case 'object':
//       return TYPES.OBJECT
//     default:
//       if (dataType && dataType.indexOf('array') > -1) {
//         return TYPES.ARRAY
//       } else {
//         return TYPES.STRING
//       }
//   }
// }

interface OldParameter {
  id: number
  name: string
  mockData: string
  identifier: string
  remark: string
  dataType: string
  parameterList: OldParameter[]
}

interface SwaggerParameter {
  name: string
  description: string
  example: string
  required?: boolean
  type: string
  in?: string
  items?: SwaggerParameter
  properties?: any
}

type ModifyType = "equal" | "create" | "update"

interface ModifyArgs {
  id?: number
  type: ModifyType
  prop: {
    scope: string;
    name: string;
    type: string;
    description: string;
    pos: number;
    required: boolean;
  }
  children: ModifyArgs[]
}

interface SyncData {
  deleteProps: Property[]
  modify: ModifyArgs[]
}
