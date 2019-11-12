import { Table, Column, Model, AutoIncrement, PrimaryKey, AllowNull, DataType, Unique } from 'sequelize-typescript'

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export default class OAuth extends Model<OAuth> {

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(32))
  appId: string

  @Column(DataType.STRING(32))
  secret: string

}