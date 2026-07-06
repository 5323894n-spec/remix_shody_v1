import { Breakdown, Driver, Dispatcher, Vehicle, Incident } from './types';

export const INITIAL_BREAKDOWNS: Breakdown[] = [
  {
    id: 1,
    breakdown_code: 'BRK-001',
    category: 'Двигатель',
    breakdown_name: 'Двигатель греется / закипание охлаждающей жидкости',
    keywords: 'кипит, парит, антифриз, температура, радиатор, помпа, перегрев, нагрев, закипел',
    criticality: 'Критическая',
    responsible_department: 'Моторный цех',
    status: 'активная'
  },
  {
    id: 2,
    breakdown_code: 'BRK-002',
    category: 'Жидкости и течи',
    breakdown_name: 'Утечка технических жидкостей (масло, антифриз, ГУР)',
    keywords: 'течь, капает, льется, утечка, капли, лужа, капание, масло, тосол',
    criticality: 'Высокая',
    responsible_department: 'Слесарный участок',
    status: 'активная'
  },
  {
    id: 3,
    breakdown_code: 'BRK-003',
    category: 'Тормозная система',
    breakdown_name: 'Неисправность тормозов / утечка воздуха из контура',
    keywords: 'тормоз, воздух, шипит, манометр, давление воздуха, суппорт, колодки',
    criticality: 'Критическая',
    responsible_department: 'Тормозной участок',
    status: 'активная'
  },
  {
    id: 4,
    breakdown_code: 'BRK-004',
    category: 'Пневмосистема',
    breakdown_name: 'Срыв / разгерметизация пневмоподвески (кузов на боку)',
    keywords: 'подвеска, пневмоподушка, упал кузов, на боку, колено, крен, подушка',
    criticality: 'Высокая',
    responsible_department: 'Участок пневматики',
    status: 'активная'
  },
  {
    id: 5,
    breakdown_code: 'BRK-005',
    category: 'Трансмиссия',
    breakdown_name: 'Неисправность КПП / блокировка передач / пинки',
    keywords: 'кпп, коробка, передача, дергает, не едет, акпп, передачи, пинается',
    criticality: 'Критическая',
    responsible_department: 'Агрегатный цех',
    status: 'активная'
  },
  {
    id: 6,
    breakdown_code: 'BRK-006',
    category: 'Электрооборудование',
    breakdown_name: 'Отказ электрики / фар / электронного маршрутоуказателя',
    keywords: 'генератор, зарядка, аккумулятор, фары, эму, табло, свет, приборы, проводка',
    criticality: 'Средняя',
    responsible_department: 'Электротехнический участок',
    status: 'активная'
  },
  {
    id: 7,
    breakdown_code: 'BRK-007',
    category: 'Ходовая и колеса',
    breakdown_name: 'Прокол / повреждение колеса / сход развала',
    keywords: 'колесо, шина, прокол, спустило, порез, лопнуло, диск, ступица',
    criticality: 'Средняя',
    responsible_department: 'Шиномонтажный участок',
    status: 'активная'
  },
  {
    id: 8,
    breakdown_code: 'BRK-008',
    category: 'Здоровье',
    breakdown_name: 'Плохое самочувствие водителя на линии',
    keywords: 'давление, голова, плохо, сердце, тошнота, температура водителя, заболел, гипертония',
    criticality: 'Критическая',
    responsible_department: 'Медицинский пункт (ПРМО)',
    status: 'активная'
  },
  {
    id: 9,
    breakdown_code: 'BRK-009',
    category: 'ДТП',
    breakdown_name: 'Дорожно-транспортное происшествие (столкновение / притирка)',
    keywords: 'дтп, авария, ударил, врезался, притер, догнал, столкновение, гаи',
    criticality: 'Критическая',
    responsible_department: 'Служба БД (Безопасность движения)',
    status: 'активная'
  },
  {
    id: 10,
    breakdown_code: 'BRK-010',
    category: 'Отопление / Кондиционер',
    breakdown_name: 'Отказ салонного отопителя (печки) / кондиционера',
    keywords: 'печка, холодно, кондиционер, климат, обдув, вентилятор, замерзает, жарко',
    criticality: 'Низкая',
    responsible_department: 'Климатический участок',
    status: 'активная'
  },
  {
    id: 11,
    breakdown_code: 'BRK-011',
    category: 'Кузов и двери',
    breakdown_name: 'Неисправность дверей / заклинивание приводов створок',
    keywords: 'дверь, двери, заклинило, не открывается, створка, кнопка двери, зажало',
    criticality: 'Средняя',
    responsible_department: 'Кузовной цех',
    status: 'активная'
  },
  {
    id: 12,
    breakdown_code: 'BRK-012',
    category: 'Остекление',
    breakdown_name: 'Повреждение / трещина ветрового стекла или зеркал',
    keywords: 'стекло, лобовое, трещина, зеркало, разбито, камень, дворник',
    criticality: 'Низкая',
    responsible_department: 'Кузовной цех',
    status: 'активная'
  },
  {
    id: 13,
    breakdown_code: 'BRK-013',
    category: 'Прочие',
    breakdown_name: 'Иная техническая неисправность',
    keywords: 'прочее, другое, неисправность, сломалось, сход, инцидент',
    criticality: 'Средняя',
    responsible_department: 'Слесарный участок',
    status: 'активная'
  }
];

export const INITIAL_DRIVERS: Driver[] = [
  { id: 1, tab_number: '1021', name: 'Смирнов Александр Викторович' },
  { id: 2, tab_number: '1022', name: 'Кузнецов Дмитрий Сергеевич' },
  { id: 3, tab_number: '1023', name: 'Васильев Сергей Петрович' },
  { id: 4, tab_number: '1024', name: 'Попов Андрей Николаевич' },
  { id: 5, tab_number: '1025', name: 'Соколов Михаил Юрьевич' },
  { id: 6, tab_number: '1026', name: 'Лебедев Алексей Дмитриевич' },
  { id: 7, tab_number: '1027', name: 'Козлов Илья Владимирович' },
  { id: 8, tab_number: '1028', name: 'Морозов Денис Игоревич' },
  { id: 9, tab_number: '1029', name: 'Новиков Роман Александрович' },
  { id: 10, tab_number: '1030', name: 'Федоров Павел Сергеевич' }
];

export const INITIAL_DISPATCHERS: Dispatcher[] = [
  { id: 1, tab_number: 'D-01', name: 'Петров Иван Иванович' },
  { id: 2, tab_number: 'D-02', name: 'Сидоров Петр Сергеевич' },
  { id: 3, tab_number: 'D-03', name: 'Ковалева Анна Андреевна' }
];

export const INITIAL_VEHICLES: Vehicle[] = [
  { id: 1, vehicle_number: 'А012АА178', model: 'ЛиАЗ-5292', bus_class: 'большой' },
  { id: 2, vehicle_number: 'В123ВВ178', model: 'МАЗ-203', bus_class: 'большой' },
  { id: 3, vehicle_number: 'С234СС178', model: 'Волгабас-5270', bus_class: 'большой' },
  { id: 4, vehicle_number: 'Е345ЕЕ178', model: 'ЛиАЗ-6213', bus_class: 'особо большой' },
  { id: 5, vehicle_number: 'К456КК178', model: 'ПАЗ-3204', bus_class: 'средний' },
  { id: 6, vehicle_number: 'М567ММ178', model: 'МАЗ-206', bus_class: 'средний' },
  { id: 7, vehicle_number: 'Н678НН178', model: 'ЛиАЗ-5292', bus_class: 'большой' },
  { id: 8, vehicle_number: 'О789ОО178', model: 'МАЗ-203', bus_class: 'большой' },
  { id: 9, vehicle_number: 'Р890РР178', model: 'Волгабас-6271', bus_class: 'особо большой' }
];

export const INITIAL_INCIDENTS: Incident[] = [];
