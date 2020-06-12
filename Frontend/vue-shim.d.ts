declare module "*.vue" {
  import Vue from 'vue'

  export default Vue
}


declare module "http" {
  export interface IncomingMessage{
    body: any
  }

}

