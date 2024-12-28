export default class User {
  id = 0
  username = ''
  name = ''
  age = 0
  email = ''

  getUserName() {
    return this.username || this.id
  }

  getFullName() {
    return `${this.name} ${this.age}`;
  }

  getEmailDomain() {
    return this.email.split('@')[1];
  }

  isAdult() {
    return this.age >= 18;
  }

  static createFromJSON(json) {
    return new User(json.name, json.age, json.email);
  }
}