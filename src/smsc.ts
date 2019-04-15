class Smsc {
  /**
   * @var string ApiKey de SMSC
   */
  private apikey;
  /**
   * @var string Alias de SMSC
   */
  private alias;
  public version = '0.3';
  public protocol = 'https';

  private priority = null;
  private line = null;
  private mensaje;
  private numeros = [];
  private return;


  public constructor(alias = null, apikey = null) {
    if (alias !== null) {
      this.setAlias(alias);
    }
    if (apikey !== null) {
      this.setApikey(apikey);
    }
  }


  public getApikey = () => {
    return this.apikey;
  }
  public setApikey = (apikey) => {
    this.apikey = apikey;
  }
  public getAlias = () => {
    return this.alias;
  }
  public setAlias = (alias) => {
    this.alias = alias;
  }
  public getData = () => {
    return this.return['data'];
  }
  public getStatusCode = () => {
    return this.return['code'];
  }
  public getStatusMessage = () => {
    return this.return['message'];
  }
  public exec = (cmd = null, extradata = null) => {
    const THIS = this;
    THIS.return = null;
    // construyo la URL de consulta
    const url = `${this.protocol}://www.smsc.com.ar/api/${this.version}/?alias=${this.alias}&apikey=${this.apikey}`;
    let url2 = '';
    if (cmd !== null) {
      url2 += `&cmd=${cmd}`;
    }
    if (extradata !== null) {
      url2 += extradata;
    }
    let xhr = new XMLHttpRequest();
    xhr.open('POST', url + url2);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
      if (xhr.status === 200) {
        const ret = JSON.parse(xhr.responseText);
        if (Array.isArray(ret)) {
          throw new Error('Datos recibidos, pero no han podido ser reconocidos ("' + ret + '") (url2=' + url2 + ').');
          return false;
        }
        THIS.return = ret;
      }
      else if (xhr.status !== 200) {
        throw new Error('No se pudo conectar al servidor. Estado:' + xhr.status);
        return false;
      }
    };
    xhr.send();
    return true;
  }
  /**
   * Estado del sistema SMSC.
   * @return bool Devuelve true si no hay demoras en la entrega.
   */
  public getEstado = () => {
    let ret = this.exec('estado');
    if (!ret)
      return false;
    if (this.getStatusCode() != 200) {
      throw new Error(this.getStatusMessage() + this.getStatusCode());
      return false;
    } else {
      ret = this.getData();
      return ret['estado'];
    }
  }
  /**
   * Validar número
   * @return bool Devuelve true si es un número válido.
   */
  public evalNumero = (prefijo, fijo = null) => {
    let ret = this.exec('evalnumero', '&num=' + prefijo + (fijo === null ? '' : '-' + fijo));
    if (!ret)
      return false;
    if (this.getStatusCode() != 200) {
      throw new Error(this.getStatusMessage() + this.getStatusCode());
      return false;
    } else {
      ret = this.getData();
      return ret['estado'];
    }
  }
  /**
   *
   * @return array
   */
  public getSaldo = () => {
    let ret = this.exec('saldo');
    if (!ret)
      return false;
    if (this.getStatusCode() != 200) {
      throw new Error(this.getStatusMessage() + this.getStatusCode());
      return false;
    } else {
      ret = this.getData();
      return ret['mensajes'];
    }
  }
  /**
   *
   * @param int $prioridad 0:todos 1:baja 2:media 3:alta
   * @return array
   */
  public getEncolados = (prioridad = 0) => {
    let ret = this.exec('encolados', '&prioridad=' + +prioridad);
    if (!ret)
      return false;
    if (this.getStatusCode() != 200) {
      throw new Error(this.getStatusMessage() + this.getStatusCode());
      return false;
    } else {
      ret = this.getData();
      return ret['mensajes'];
    }
  }
  /**
   * *******************************************
   * *******   Metodos para enviar SMS   *******
   * *******************************************
   */
  /**
   * @param integer $prefijo    Prefijo del área, sin 0
   *                    Ej: 2627 ó 2627530000
   * @param integer $fijo Número luego del 15, sin 15
   *                    Si sólo especifica prefijo, se tomará como número completo (no recomendado).
   *                    Ej: 530000
   */
  public addNumero = (prefijo, fijo = null) => {
    if (fijo === null) {
      this.numeros.push(prefijo);
    } else {
      this.numeros.push(prefijo + '-' + fijo);
    }
  }
  public getMensaje = () => {
    return this.mensaje;
  }
  public setMensaje = (mensaje) => {
    this.mensaje = mensaje;
  }

  public getLinea = () => {
    return this.line;
  }
  /**
   * @param int $line_id. Only for dedicated lines.
   */
  public setLinea = (line_id) => {
    this.line = line_id;
  }
  public getPrioridad = () => {
    return this.line;
  }
  /**
   * @param int $priority 1 for low to 7 for high. null for default.
   */
  public setPrioridad = (priority) => {
    this.priority = priority;
  }

  public enviar = () => {
    let params = [];
    params.push(`num=${this.numeros.join(",")}`);
    params.push(`msj=${encodeURI(this.mensaje)}`);

    if (this.getLinea() > 0)
      params.push(`line='${this.getLinea()}`);

    if (this.getPrioridad() > 0)
      params.push(`{priority=${this.getPrioridad()}`);

    const ret = this.exec('enviar', `&${params.join("&")}`);
    if (!ret)
      return false;
    if (this.getStatusCode() != 200) {
      throw new Error(this.getStatusMessage() + this.getStatusCode());
    } else {
      return this.getData();
    }
  }
  /**
   * ***********************************************
   * *******  Metodos para hacer consultas   *******
   * ***********************************************
   */
  /**
   * Devuelve los últimos 30 SMSC recibidos.
   * 
   * Lo óptimo es usar esta función cuando se recibe la notificación, que puede
   * especificar en https://www.smsc.com.ar/usuario/api/
   * 
   * @param int $ultimoid si se especifica, el sistema sólo devuelve los SMS
   * más nuevos al sms con id especificado (acelera la
   * consulta y permite un chequeo rápido de nuevos mensajes)
   */
  public getRecibidos = ($ultimoid = 0) => {
    const ret = this.exec('recibidos', `&ultimoid=${+$ultimoid}`);
    if (!ret)
      return false;
    if (this.getStatusCode() != 200) {
      throw new Error(this.getStatusMessage() + this.getStatusCode());
    } else {
      return this.getData();
    }
  }
}