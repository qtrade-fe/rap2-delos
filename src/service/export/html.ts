import { Repository, Interface, Module, Property } from "../../models"
import exportHtml from "../../helpers/exportHelper"

export default class HtmlService {
  public static async export(
    repositoryId: number,
    origin: string
  ): Promise<string> {
    const repo = await Repository.findByPk(repositoryId, {
      include: [
        {
          model: Module,
          as: "modules",
          include: [
            {
              model: Interface,
              as: "interfaces",
              include: [
                {
                  model: Property,
                  as: "properties"
                }
              ]
            }
          ]
        }
      ]
    })

    return exportHtml(repo, origin)
  }
}
